import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

// ─── Référentiel des compétences ───────────────────────────────────────────

export const listerCompetences = async ({ matiereId, page = 1, limite = 50 } = {}) => {
  const where = matiereId ? { matiereId } : {};
  const [total, competences] = await Promise.all([
    prisma.competence.count({ where }),
    prisma.competence.findMany({
      where,
      include: {
        matiere: { select: { id: true, code: true, nom: true } },
        criteres: true,
        _count: { select: { competencesEleve: true } },
      },
      orderBy: [{ matiereId: 'asc' }, { code: 'asc' }],
      skip: (page - 1) * limite,
      take: limite,
    }),
  ]);
  return { competences, total, page, pages: Math.ceil(total / limite) };
};

export const obtenirCompetence = async (id) => {
  const c = await prisma.competence.findUnique({
    where: { id },
    include: {
      matiere: { select: { id: true, code: true, nom: true } },
      criteres: true,
    },
  });
  if (!c) throw erreur('Compétence introuvable', 404);
  return c;
};

export const creerCompetence = ({ code, description, matiereId }) =>
  prisma.competence.create({
    data: { code, description, matiereId },
    include: { matiere: { select: { id: true, code: true, nom: true } } },
  });

export const modifierCompetence = async (id, { code, description }) => {
  await obtenirCompetence(id);
  return prisma.competence.update({
    where: { id },
    data: { ...(code && { code }), ...(description && { description }) },
    include: { matiere: { select: { id: true, code: true, nom: true } } },
  });
};

export const supprimerCompetence = async (id) => {
  await obtenirCompetence(id);
  await prisma.competence.delete({ where: { id } });
};

// ─── Niveaux d'un élève ────────────────────────────────────────────────────

export const niveauxEleve = async (eleveId) => {
  const [niveaux, totalReferentiel] = await Promise.all([
    prisma.competenceEleve.findMany({
      where: { eleveId },
      include: {
        competence: {
          include: { matiere: { select: { id: true, code: true, nom: true } } },
        },
      },
      orderBy: [{ competence: { code: 'asc' } }],
    }),
    prisma.competence.count(),
  ]);
  return { niveaux, totalReferentiel };
};

export const mettreAJourNiveau = (eleveId, competenceId, niveau) =>
  prisma.competenceEleve.upsert({
    where: { eleveId_competenceId: { eleveId, competenceId } },
    create: { eleveId, competenceId, niveau },
    update: { niveau },
    include: { competence: { select: { code: true, description: true } } },
  });

// ─── Tableau de bord classe × compétences ─────────────────────────────────

export const tableauBordClasse = async (classeId, matiereId) => {
  const [eleveRows, competences] = await Promise.all([
    prisma.classeEleve.findMany({
      where: { classeId },
      include: { eleve: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { eleve: { nom: 'asc' } },
    }),
    prisma.competence.findMany({
      where: { matiereId },
      include: { criteres: true },
      orderBy: { code: 'asc' },
    }),
  ]);

  const eleveIds = eleveRows.map((e) => e.eleveId);
  const competenceIds = competences.map((c) => c.id);

  const niveaux = await prisma.competenceEleve.findMany({
    where: { eleveId: { in: eleveIds }, competenceId: { in: competenceIds } },
  });

  const index = {};
  for (const n of niveaux) {
    (index[n.eleveId] ??= {})[n.competenceId] = n.niveau;
  }

  return {
    eleves: eleveRows.map((e) => e.eleve),
    competences,
    niveaux: index,
  };
};
