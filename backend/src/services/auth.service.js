import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';

const SALT_ROUNDS = 12;
const RESET_TOKEN_VALIDITE_MS = 24 * 60 * 60 * 1000;

const genererToken = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// Retire le hash du mot de passe avant de renvoyer l'objet
const sansMdp = ({ motDePasse: _motDePasse, ...u }) => u;

export const inscrire = async ({ email, motDePasse, prenom, nom }) => {
  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) {
    const err = new Error('Cet email est déjà utilisé');
    err.status = 409;
    throw err;
  }

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);
  const utilisateur = await prisma.utilisateur.create({
    data: { email, motDePasse: hash, prenom, nom },
  });

  return { utilisateur: sansMdp(utilisateur), token: genererToken(utilisateur) };
};

export const connecter = async ({ email, motDePasse }) => {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email } });

  // Message volontairement identique pour ne pas révéler si l'email existe
  const errAuth = Object.assign(new Error('Identifiants invalides'), { status: 401 });

  if (!utilisateur || !utilisateur.actif) throw errAuth;

  const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
  if (!valide) throw errAuth;

  return { utilisateur: sansMdp(utilisateur), token: genererToken(utilisateur) };
};

// Génère un lien de réinitialisation pour un utilisateur (déclenché par l'admin,
// pas d'envoi d'email — cf. flux "mot de passe oublié" médié par l'admin).
// Le token en clair n'est retourné qu'ici, jamais stocké tel quel en base.
export const genererResetToken = async (id) => {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id } });
  if (!utilisateur) {
    throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.utilisateur.update({
    where: { id },
    data: { resetTokenHash, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_VALIDITE_MS) },
  });

  return token;
};

export const reinitialiserMotDePasse = async ({ token, motDePasse }) => {
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const utilisateur = await prisma.utilisateur.findFirst({
    where: { resetTokenHash, resetTokenExpiresAt: { gt: new Date() } },
  });
  if (!utilisateur) {
    throw Object.assign(new Error('Lien invalide ou expiré'), { status: 400 });
  }

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);
  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { motDePasse: hash, resetTokenHash: null, resetTokenExpiresAt: null },
  });
};

export const moi = async (id) => {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      createdAt: true,
      updatedAt: true,
      profil: true,
    },
  });

  if (!utilisateur) {
    throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });
  }
  return utilisateur;
};
