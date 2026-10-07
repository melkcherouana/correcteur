import prisma from './prisma.js';

// Format accepté pour un identifiant saisi à la main par l'admin
export const IDENTIFIANT_RE = /^[a-z0-9]+([._-][a-z0-9]+)*$/;

// Minuscules, sans accents, sans espaces ni caractères spéciaux
// (même règle que la migration 20261007120000_add_identifiant)
const normaliser = (texte) =>
  String(texte ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Ex. : « Jean-Pierre », « Dupont » → « jeanpierre.dupont »
export const identifiantDeBase = (prenom, nom) =>
  `${normaliser(prenom) || 'utilisateur'}.${normaliser(nom) || 'utilisateur'}`;

// Identifiant libre en base : prenom.nom, sinon prenom.nom2, prenom.nom3…
export const genererIdentifiantUnique = async (prenom, nom) => {
  const base = identifiantDeBase(prenom, nom);
  const existants = await prisma.utilisateur.findMany({
    where: { identifiant: { startsWith: base } },
    select: { identifiant: true },
  });
  const pris = new Set(existants.map((u) => u.identifiant));
  if (!pris.has(base)) return base;
  let n = 2;
  while (pris.has(`${base}${n}`)) n++;
  return `${base}${n}`;
};

// Vérifie un identifiant choisi manuellement (format + unicité)
export const verifierIdentifiantDisponible = async (identifiant, exclureId = null) => {
  if (!IDENTIFIANT_RE.test(identifiant)) {
    throw Object.assign(
      new Error('Identifiant invalide : minuscules, chiffres et . - _ uniquement, sans espaces ni accents'),
      { status: 422 }
    );
  }
  const existant = await prisma.utilisateur.findUnique({ where: { identifiant }, select: { id: true } });
  if (existant && existant.id !== exclureId) {
    throw Object.assign(new Error('Cet identifiant est déjà utilisé'), { status: 409 });
  }
};
