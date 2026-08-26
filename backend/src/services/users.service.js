import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import prisma from '../utils/prisma.js';
import * as authService from './auth.service.js';

const SALT_ROUNDS = 12;

const SELECT_PUBLIC = {
  id: true, email: true, prenom: true, nom: true,
  role: true, actif: true, createdAt: true, updatedAt: true,
  profil: true,
  classe: { include: { classe: { select: { id: true, nom: true, niveau: true } } } },
};

export const listerUtilisateurs = async ({ role, actif, search, page = 1, limite = 20 } = {}) => {
  const where = {
    ...(role && { role }),
    ...(actif !== undefined && { actif }),
    ...(search && {
      OR: [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, utilisateurs] = await Promise.all([
    prisma.utilisateur.count({ where }),
    prisma.utilisateur.findMany({
      where,
      select: SELECT_PUBLIC,
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      skip: (page - 1) * limite,
      take: limite,
    }),
  ]);

  return { utilisateurs, total, page, pages: Math.ceil(total / limite) };
};

export const obtenirUtilisateur = async (id) => {
  const u = await prisma.utilisateur.findUnique({ where: { id }, select: SELECT_PUBLIC });
  if (!u) throw Object.assign(new Error('Utilisateur introuvable'), { status: 404 });
  return u;
};

export const creerUtilisateur = async ({ email, motDePasse, prenom, nom, role = 'ELEVE', classeId }) => {
  const existant = await prisma.utilisateur.findUnique({ where: { email } });
  if (existant) throw Object.assign(new Error('Email déjà utilisé'), { status: 409 });

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);
  const user = await prisma.utilisateur.create({
    data: { email, motDePasse: hash, prenom, nom, role },
    select: { id: true },
  });

  if (classeId && role === 'ELEVE') {
    const classe = await prisma.classe.findUnique({ where: { id: classeId } });
    if (classe) {
      await prisma.classeEleve.create({ data: { eleveId: user.id, classeId } });
    }
  }

  return obtenirUtilisateur(user.id);
};

export const mettreAJourUtilisateur = async (id, donnees, parAdmin = false) => {
  const ancien = await obtenirUtilisateur(id);

  const data = { ...donnees };
  if (data.motDePasse) {
    data.motDePasse = await bcrypt.hash(data.motDePasse, SALT_ROUNDS);
  } else {
    delete data.motDePasse;
  }
  if (!parAdmin) delete data.role;

  // Un utilisateur qui n'est plus ELEVE ne doit plus être inscrit dans une
  // classe en tant qu'élève (sans quoi il resterait compté dans l'effectif
  // de la classe, les bulletins, les stats, etc.)
  if (data.role && data.role !== 'ELEVE' && ancien.role === 'ELEVE') {
    await prisma.classeEleve.deleteMany({ where: { eleveId: id } });
  }

  return prisma.utilisateur.update({ where: { id }, data, select: SELECT_PUBLIC });
};

export const changerRole = async (id, role) => {
  const u = await obtenirUtilisateur(id);
  if (u.role === 'ADMIN') {
    throw Object.assign(new Error('Impossible de modifier le rôle d\'un administrateur'), { status: 403 });
  }
  if (role !== 'ELEVE' && u.role === 'ELEVE') {
    await prisma.classeEleve.deleteMany({ where: { eleveId: id } });
  }
  return prisma.utilisateur.update({ where: { id }, data: { role }, select: SELECT_PUBLIC });
};

export const changerClasse = async (userId, classeId) => {
  const utilisateur = await obtenirUtilisateur(userId);
  if (!classeId) {
    await prisma.classeEleve.deleteMany({ where: { eleveId: userId } });
  } else {
    if (utilisateur.role !== 'ELEVE') {
      throw Object.assign(new Error('Seul un compte de rôle ELEVE peut être inscrit dans une classe'), { status: 400 });
    }
    const classe = await prisma.classe.findUnique({ where: { id: classeId } });
    if (!classe) throw Object.assign(new Error('Classe introuvable'), { status: 404 });
    await prisma.classeEleve.upsert({
      where: { eleveId: userId },
      update: { classeId },
      create: { eleveId: userId, classeId },
    });
  }
  return obtenirUtilisateur(userId);
};

export const supprimerUtilisateur = async (id) => {
  const u = await obtenirUtilisateur(id);
  if (u.role === 'ADMIN') {
    throw Object.assign(new Error('Impossible de désactiver un compte administrateur'), { status: 403 });
  }
  await prisma.utilisateur.update({ where: { id }, data: { actif: false } });
};

export const reactiverUtilisateur = async (id) => {
  await obtenirUtilisateur(id);
  await prisma.utilisateur.update({ where: { id }, data: { actif: true } });
};

export const genererLienReset = (id) => authService.genererResetToken(id);

export const supprimerDefinitivement = async (id) => {
  const u = await obtenirUtilisateur(id);
  if (u.role === 'ADMIN') {
    throw Object.assign(new Error('Impossible de supprimer un compte administrateur'), { status: 403 });
  }
  await prisma.utilisateur.delete({ where: { id } });
};

const ROLES_VALIDES = ['ADMIN', 'ENSEIGNANT', 'ELEVE'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Normalise les noms de colonnes (accents, casse, espaces) */
const col = (ligne, ...noms) => {
  for (const n of noms) {
    if (ligne[n] !== undefined) return String(ligne[n]).trim();
  }
  return '';
};

export const importerEnMasse = async (buffer) => {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const lignes = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const crees   = [];
  const erreurs = [];

  // Détection des doublons d'email dans le fichier lui-même
  const emailsDuFichier = new Set();

  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const num = i + 2;

    const prenom    = col(l, 'Prénom', 'Prenom', 'prenom', 'PRENOM');
    const nom       = col(l, 'Nom', 'nom', 'NOM');
    const email     = col(l, 'Email', 'email', 'EMAIL', 'E-mail').toLowerCase();
    const role      = col(l, 'Rôle', 'Role', 'role', 'ROLE').toUpperCase() || 'ELEVE';
    const mdp       = col(l, 'Mot de passe', 'motDePasse', 'mot_de_passe', 'Password') || 'EvalPro1';
    const nomClasse = col(l, 'Classe', 'classe', 'CLASSE');

    if (!prenom)                         { erreurs.push({ ligne: num, email: email || '—', message: 'Prénom manquant' }); continue; }
    if (!nom)                            { erreurs.push({ ligne: num, email: email || '—', message: 'Nom manquant' }); continue; }
    if (!email || !EMAIL_RE.test(email)) { erreurs.push({ ligne: num, email: email || '—', message: 'Email invalide' }); continue; }
    if (emailsDuFichier.has(email))      { erreurs.push({ ligne: num, email, message: 'Email en doublon dans le fichier' }); continue; }
    if (!ROLES_VALIDES.includes(role))   { erreurs.push({ ligne: num, email, message: `Rôle invalide : ${role}` }); continue; }
    if (mdp.length < 8)                  { erreurs.push({ ligne: num, email, message: 'Mot de passe trop court (8 caractères min.)' }); continue; }

    // Vérification classe AVANT création du compte
    let classeId = null;
    if (nomClasse && role === 'ELEVE') {
      const classe = await prisma.classe.findFirst({
        where: { nom: { equals: nomClasse, mode: 'insensitive' } },
      });
      if (!classe) { erreurs.push({ ligne: num, email, message: `Classe "${nomClasse}" introuvable` }); continue; }
      classeId = classe.id;
    }

    emailsDuFichier.add(email);

    try {
      const u = await creerUtilisateur({ email, motDePasse: mdp, prenom, nom, role });
      let classeNom = null;
      if (classeId) {
        await prisma.classeEleve.create({ data: { classeId, eleveId: u.id } });
        classeNom = nomClasse;
      }
      crees.push({ id: u.id, prenom, nom, email, role, classe: classeNom });
    } catch (err) {
      erreurs.push({ ligne: num, email, message: err.message ?? 'Erreur création' });
    }
  }

  return { crees, erreurs, total: lignes.length };
};

export const genererModeleExcel = () => {
  const wb = XLSX.utils.book_new();
  const donnees = [
    { 'Prénom': 'Alice', 'Nom': 'Martin', 'Email': 'alice.martin@lycee.fr', 'Rôle': 'ELEVE',      'Classe': 'BAC PRO SN 1',  'Mot de passe': 'EvalPro1' },
    { 'Prénom': 'Lucas', 'Nom': 'Bernard','Email': 'lucas.bernard@lycee.fr','Rôle': 'ELEVE',      'Classe': 'BAC PRO SN 1',  'Mot de passe': 'EvalPro1' },
    { 'Prénom': 'Jean',  'Nom': 'Dupont', 'Email': 'jean.dupont@lycee.fr',  'Rôle': 'ENSEIGNANT', 'Classe': '',              'Mot de passe': 'EvalPro1' },
  ];
  const ws = XLSX.utils.json_to_sheet(donnees);
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
