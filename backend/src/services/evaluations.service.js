import prisma from '../utils/prisma.js';

const INCLUDE_COMPETENCES = {
  include: {
    competence: {
      select: {
        id: true, code: true, description: true, ordre: true,
        pole: { select: { id: true, code: true, titre: true, ordre: true } },
      },
    },
  },
  orderBy: { competence: { code: 'asc' } },
};

const INCLUDE_LISTE = {
  classe:   { select: { id: true, nom: true, niveau: true } },
  createur: { select: { id: true, prenom: true, nom: true } },
  sequence: {
    select: {
      id: true, titre: true,
      matiere: {
        select: {
          id: true, code: true, nom: true,
          competences: { select: { id: true, code: true, description: true }, orderBy: { code: 'asc' } },
        },
      },
    },
  },
  competences: INCLUDE_COMPETENCES,
  _count:   { select: { notes: true } },
};

const INCLUDE_DETAIL = {
  ...INCLUDE_LISTE,
  notes: {
    include: {
      eleve:  { select: { id: true, prenom: true, nom: true } },
      critere: { select: { id: true, description: true, noteMax: true } },
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const calculerStats = (notes) => {
  const valeurs = notes.map((n) => n.valeur).filter((v) => v !== null);
  if (!valeurs.length) return { nbSaisies: 0, moyenne: null, min: null, max: null };
  const sum = valeurs.reduce((a, b) => a + b, 0);
  return {
    nbSaisies: valeurs.length,
    moyenne: Math.round((sum / valeurs.length) * 100) / 100,
    min: Math.min(...valeurs),
    max: Math.max(...valeurs),
  };
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const listerEvaluations = async ({
  classeId, sequenceId, type, statut, createurId, eleveId, page = 1, limite = 20,
} = {}) => {
  const where = {
    ...(classeId    && { classeId }),
    ...(sequenceId  && { sequenceId }),
    ...(type        && { type }),
    ...(statut      && { statut }),
    ...(createurId  && { createurId }),
  };

  const [total, evaluations] = await Promise.all([
    prisma.evaluation.count({ where }),
    prisma.evaluation.findMany({
      where,
      include: INCLUDE_LISTE,
      orderBy: [{ datePassage: 'desc' }, { createdAt: 'desc' }],
      skip:  (page - 1) * limite,
      take:  limite,
    }),
  ]);

  // Vue élève : enrichir chaque évaluation avec le statut de la soumission de l'élève
  if (eleveId && evaluations.length > 0) {
    const soumissions = await prisma.soumission.findMany({
      where: { eleveId, evaluationId: { in: evaluations.map((e) => e.id) } },
      select: { evaluationId: true, corrigeeIA: true, createdAt: true },
    });
    const soumMap = Object.fromEntries(soumissions.map((s) => [s.evaluationId, s]));
    return {
      evaluations: evaluations.map((e) => ({ ...e, maSoumission: soumMap[e.id] ?? null })),
      total, page, pages: Math.ceil(total / limite),
    };
  }

  return { evaluations, total, page, pages: Math.ceil(total / limite) };
};

export const obtenirEvaluation = async (id) => {
  const e = await prisma.evaluation.findUnique({ where: { id }, include: INCLUDE_DETAIL });
  if (!e) throw erreur('Évaluation introuvable', 404);
  return { ...e, stats: calculerStats(e.notes) };
};

export const creerEvaluation = async (data, createurId) => {
  const { classeId, sequenceId, competenceIds = [] } = data;

  if (!classeId) throw erreur('La classe est requise', 400);

  const [classe, sequence, createur] = await Promise.all([
    prisma.classe.findUnique({ where: { id: classeId } }),
    sequenceId ? prisma.sequence.findUnique({ where: { id: sequenceId } }) : null,
    prisma.utilisateur.findUnique({ where: { id: createurId } }),
  ]);
  if (!classe)    throw erreur('Classe introuvable', 404);
  if (!createur)  throw erreur('Session expirée, veuillez vous reconnecter', 401);
  if (sequenceId && !sequence) throw erreur('Séquence introuvable', 404);

  return prisma.evaluation.create({
    data: {
      titre:       data.titre,
      description: data.description || null,
      type:        data.type,
      statut:      data.statut,
      noteMax:     data.noteMax,
      coefficient: data.coefficient,
      classeId,
      sequenceId:  sequenceId || null,
      createurId,
      datePassage: data.datePassage ? new Date(data.datePassage) : null,
      competences: competenceIds.length > 0
        ? { create: competenceIds.map((competenceId) => ({ competenceId })) }
        : undefined,
    },
    include: INCLUDE_LISTE,
  });
};

export const mettreAJourEvaluation = async (id, data, utilisateurId) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);
  if (evaluation.statut === 'ARCHIVEE') throw erreur('Impossible de modifier une évaluation archivée', 409);

  const { competenceIds, ...rest } = data;

  // Synchroniser les compétences ciblées si fourni
  if (Array.isArray(competenceIds)) {
    await prisma.evaluationCompetence.deleteMany({ where: { evaluationId: id } });
    if (competenceIds.length > 0) {
      await prisma.evaluationCompetence.createMany({
        data: competenceIds.map((competenceId) => ({ evaluationId: id, competenceId })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.evaluation.update({
    where: { id },
    data: { ...rest, datePassage: rest.datePassage ? new Date(rest.datePassage) : undefined },
    include: INCLUDE_LISTE,
  });
};

export const changerStatut = async (id, statut) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);
  return prisma.evaluation.update({ where: { id }, data: { statut }, include: INCLUDE_LISTE });
};

export const supprimerEvaluation = async (id) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);
  // Archivage logique — préserve les notes existantes
  await prisma.evaluation.update({ where: { id }, data: { statut: 'ARCHIVEE' } });
};

// ─── Notes d'une évaluation ───────────────────────────────────────────────────

export const obtenirNotesEvaluation = async (id) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      ...INCLUDE_LISTE,
      classe: {
        include: {
          eleves: { include: { eleve: { select: { id: true, prenom: true, nom: true } } } },
        },
      },
      notes: {
        include: {
          eleve:  { select: { id: true, prenom: true, nom: true } },
          critere: true,
        },
      },
    },
  });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);

  // Construire le tableau de saisie : tous les élèves de la classe avec leur note (ou null)
  const notesParEleve = Object.fromEntries(
    evaluation.notes.map((n) => [n.eleveId, n])
  );

  const grille = evaluation.classe.eleves.map(({ eleve }) => ({
    eleve,
    note: notesParEleve[eleve.id] ?? null,
  }));

  return {
    evaluation: { ...evaluation, classe: { id: evaluation.classe.id, nom: evaluation.classe.nom } },
    grille,
    stats: calculerStats(evaluation.notes),
  };
};
