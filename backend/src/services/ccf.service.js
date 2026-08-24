import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const INCLUDE_CCF = {
  classe:    { select: { id: true, nom: true, niveau: true } },
  createur:  { select: { id: true, prenom: true, nom: true } },
  ccfDetail: true,
  notes: {
    include: {
      eleve: { select: { id: true, prenom: true, nom: true } },
    },
  },
};

// ─── Liste des CCF d'une classe ───────────────────────────────────────────────

export const listerCcfs = async ({ classeId } = {}) => {
  const where = { type: 'CCF', ...(classeId && { classeId }) };
  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      classe:    { select: { id: true, nom: true } },
      ccfDetail: true,
      _count: { select: { notes: true } },
    },
    orderBy: [{ classeId: 'asc' }, { createdAt: 'desc' }],
  });

  // Calcul du taux de complétion par CCF
  return Promise.all(
    evaluations.map(async (ev) => {
      const totalEleves = await prisma.classeEleve.count({ where: { classeId: ev.classeId } });
      return { ...ev, totalEleves, notesSaisies: ev._count.notes };
    })
  );
};

// ─── Détail d'un CCF ──────────────────────────────────────────────────────────

export const obtenirCcf = async (evaluationId) => {
  const ev = await prisma.evaluation.findUnique({
    where: { id: evaluationId, type: 'CCF' },
    include: {
      ...INCLUDE_CCF,
      classe: {
        include: {
          eleves: { include: { eleve: { select: { id: true, prenom: true, nom: true } } } },
        },
      },
    },
  });
  if (!ev) throw erreur('CCF introuvable', 404);
  return ev;
};

// ─── Création d'un CCF ────────────────────────────────────────────────────────

export const creerCcf = async ({
  titre, description, classeId, createurId, datePassage, noteMax = 20, coefficient = 1,
  numSituation = 1, contexte, competencesCiblees,
}) => {
  return prisma.evaluation.create({
    data: {
      titre, description, type: 'CCF', statut: 'PUBLIEE',
      classeId, createurId, noteMax, coefficient,
      datePassage: datePassage ? new Date(datePassage) : null,
      ccfDetail: {
        create: {
          numSituation,
          contexte,
          competencesCiblees: competencesCiblees ?? [],
        },
      },
    },
    include: INCLUDE_CCF,
  });
};

// ─── Modification d'un CCF ────────────────────────────────────────────────────

export const modifierCcf = async (evaluationId, {
  titre, description, datePassage, noteMax, coefficient, statut,
  numSituation, contexte, competencesCiblees, dateJury, observations,
}) => {
  const champEval = {};
  if (titre       !== undefined) champEval.titre       = titre;
  if (description !== undefined) champEval.description = description;
  if (noteMax     !== undefined) champEval.noteMax      = noteMax;
  if (coefficient !== undefined) champEval.coefficient  = coefficient;
  if (statut      !== undefined) champEval.statut       = statut;
  if (datePassage !== undefined) champEval.datePassage  = datePassage ? new Date(datePassage) : null;

  const champCcf = {};
  if (numSituation        !== undefined) champCcf.numSituation        = numSituation;
  if (contexte            !== undefined) champCcf.contexte             = contexte;
  if (competencesCiblees  !== undefined) champCcf.competencesCiblees  = competencesCiblees;
  if (dateJury            !== undefined) champCcf.dateJury             = dateJury ? new Date(dateJury) : null;
  if (observations        !== undefined) champCcf.observations         = observations;

  return prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      ...champEval,
      ccfDetail: { update: champCcf },
    },
    include: INCLUDE_CCF,
  });
};

// ─── Saisie de note pour un élève ─────────────────────────────────────────────

export const noterEleve = async (evaluationId, eleveId, { valeur, commentaire }) => {
  const ev = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
  if (!ev) throw erreur('CCF introuvable', 404);

  return prisma.note.upsert({
    where: { eleveId_evaluationId_critereId: { eleveId, evaluationId, critereId: null } },
    create: { eleveId, evaluationId, valeur, commentaire },
    update: { valeur, commentaire },
    include: { eleve: { select: { id: true, prenom: true, nom: true } } },
  });
};

// ─── Statistiques de complétion ───────────────────────────────────────────────

export const statsCompletion = async (evaluationId) => {
  const ev = await prisma.evaluation.findUnique({ where: { id: evaluationId }, select: { classeId: true } });
  if (!ev) throw erreur('CCF introuvable', 404);

  const [totalEleves, notesSaisies] = await Promise.all([
    prisma.classeEleve.count({ where: { classeId: ev.classeId } }),
    prisma.note.count({ where: { evaluationId, valeur: { not: null } } }),
  ]);

  return {
    totalEleves,
    notesSaisies,
    nonEvalues: totalEleves - notesSaisies,
    pourcentage: totalEleves > 0 ? Math.round((notesSaisies / totalEleves) * 100) : 0,
  };
};
