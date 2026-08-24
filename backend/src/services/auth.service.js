import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

const SALT_ROUNDS = 12;

const genererToken = (u) =>
  jwt.sign(
    { id: u.id, email: u.email, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// Retire le hash du mot de passe avant de renvoyer l'objet
const sansMdp = ({ motDePasse, ...u }) => u;

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
