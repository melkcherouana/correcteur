import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const INCLUDE_LISTE = {
  matiere: { select: { id: true, code: true, nom: true } },
  _count:  { select: { evaluations: true } },
};

const INCLUDE_DETAIL = {
  matiere: {
    include: {
      competences: {
        include: { criteres: true },
        orderBy: { code: 'asc' },
      },
    },
  },
  evaluations: {
    include: {
      classe:  { select: { id: true, nom: true } },
      _count:  { select: { notes: true } },
    },
    orderBy: [{ datePassage: 'asc' }, { createdAt: 'asc' }],
  },
};

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const listerSequences = ({ matiereId } = {}) =>
  prisma.sequence.findMany({
    where: matiereId ? { matiereId } : {},
    include: INCLUDE_LISTE,
    orderBy: [{ matiereId: 'asc' }, { ordre: 'asc' }, { titre: 'asc' }],
  });

export const obtenirSequence = async (id) => {
  const seq = await prisma.sequence.findUnique({ where: { id }, include: INCLUDE_DETAIL });
  if (!seq) throw erreur('Séquence introuvable', 404);

  // Stats de complétion
  const totalEleves = await prisma.classeEleve.count({
    where: { classeId: { in: [...new Set(seq.evaluations.map((e) => e.classeId))] } },
  });

  const notesSaisies = seq.evaluations.reduce((s, e) => s + e._count.notes, 0);
  const totalPossible = seq.evaluations.length * (totalEleves || 0);

  return {
    ...seq,
    stats: {
      totalEvaluations: seq.evaluations.length,
      notesSaisies,
      totalPossible,
      tauxCompletion: totalPossible > 0 ? Math.round((notesSaisies / totalPossible) * 100) : 0,
    },
  };
};

// ─── Création ─────────────────────────────────────────────────────────────────

export const creerSequence = async ({ titre, description, objectifs, matiereId, ordre }) => {
  const matiere = await prisma.matiere.findUnique({ where: { id: matiereId } });
  if (!matiere) throw erreur('Matière introuvable', 404);

  // Ordre auto = dernier + 1 si non fourni
  if (!ordre) {
    const derniere = await prisma.sequence.findFirst({
      where: { matiereId },
      orderBy: { ordre: 'desc' },
      select: { ordre: true },
    });
    ordre = (derniere?.ordre ?? 0) + 1;
  }

  return prisma.sequence.create({
    data: { titre, description, objectifs, matiereId, ordre },
    include: INCLUDE_LISTE,
  });
};

// ─── Modification ─────────────────────────────────────────────────────────────

export const modifierSequence = async (id, { titre, description, objectifs, ordre }) => {
  await obtenirSequence(id);
  const champs = {};
  if (titre       !== undefined) champs.titre       = titre;
  if (description !== undefined) champs.description = description;
  if (objectifs   !== undefined) champs.objectifs   = objectifs;
  if (ordre       !== undefined) champs.ordre       = ordre;
  return prisma.sequence.update({ where: { id }, data: champs, include: INCLUDE_LISTE });
};

// ─── Suppression ─────────────────────────────────────────────────────────────

export const supprimerSequence = async (id) => {
  const seq = await prisma.sequence.findUnique({
    where: { id },
    include: { _count: { select: { evaluations: true } } },
  });
  if (!seq) throw erreur('Séquence introuvable', 404);
  if (seq._count.evaluations > 0)
    throw erreur(`Impossible de supprimer : ${seq._count.evaluations} évaluation(s) liée(s)`, 409);
  await prisma.sequence.delete({ where: { id } });
};

// ─── Réordonnement ───────────────────────────────────────────────────────────
// Reçoit un tableau [{ id, ordre }] et met tout à jour en transaction

export const reordonner = (items) =>
  prisma.$transaction(
    items.map(({ id, ordre }) =>
      prisma.sequence.update({ where: { id }, data: { ordre } })
    )
  );
