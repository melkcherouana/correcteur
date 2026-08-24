import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

export const listerMatieres = () =>
  prisma.matiere.findMany({
    include: {
      _count: { select: { competences: true, sequences: true } },
    },
    orderBy: { nom: 'asc' },
  });

export const obtenirMatiere = async (id) => {
  const m = await prisma.matiere.findUnique({
    where: { id },
    include: {
      competences: {
        include: { criteres: true },
        orderBy: { code: 'asc' },
      },
      _count: { select: { sequences: true } },
    },
  });
  if (!m) throw erreur('Matière introuvable', 404);
  return m;
};
