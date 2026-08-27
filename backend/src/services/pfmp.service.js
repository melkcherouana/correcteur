import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const INCLUDE_PFMP = {
  eleve: { select: { id: true, prenom: true, nom: true, email: true } },
  classe: { select: { id: true, nom: true, niveau: true } },
};

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const listerPfmps = async ({ eleveId, classeId, statut } = {}) => {
  const where = {
    ...(eleveId  && { eleveId }),
    ...(classeId && { classeId }),
    ...(statut   && { statut }),
  };
  return prisma.pfmp.findMany({
    where,
    include: INCLUDE_PFMP,
    orderBy: [{ dateDebut: 'desc' }],
  });
};

export const obtenirPfmp = async (id) => {
  const pfmp = await prisma.pfmp.findUnique({ where: { id }, include: INCLUDE_PFMP });
  if (!pfmp) throw erreur('PFMP introuvable', 404);
  return pfmp;
};

// ─── Création ─────────────────────────────────────────────────────────────────

export const creerPfmp = ({
  eleveId, classeId, numero, dateDebut, dateFin,
  entrepriseNom, entrepriseAdresse, entrepriseSecteur,
  tuteurNom, tuteurEmail, tuteurTelephone, semaines,
}) =>
  prisma.pfmp.create({
    data: {
      eleveId, classeId, numero: numero ?? 1, semaines,
      dateDebut: new Date(dateDebut), dateFin: new Date(dateFin),
      entrepriseNom, entrepriseAdresse, entrepriseSecteur,
      tuteurNom, tuteurEmail, tuteurTelephone,
    },
    include: INCLUDE_PFMP,
  });

// ─── Modification ─────────────────────────────────────────────────────────────

export const modifierPfmp = async (id, data) => {
  await obtenirPfmp(id);
  const champs = {};
  const scalaires = [
    'numero', 'entrepriseNom', 'entrepriseAdresse', 'entrepriseSecteur',
    'tuteurNom', 'tuteurEmail', 'tuteurTelephone',
    'appreciationTuteur', 'appreciationEnseignant', 'noteGlobale', 'semaines',
  ];
  for (const k of scalaires) {
    if (data[k] !== undefined) champs[k] = data[k];
  }
  if (data.dateDebut) champs.dateDebut = new Date(data.dateDebut);
  if (data.dateFin)   champs.dateFin   = new Date(data.dateFin);
  if (data.statut)    champs.statut    = data.statut;
  return prisma.pfmp.update({ where: { id }, data: champs, include: INCLUDE_PFMP });
};

// ─── Évaluation des compétences ───────────────────────────────────────────────

export const evaluerCompetences = async (id, competencesEvaluees) => {
  await obtenirPfmp(id);
  return prisma.pfmp.update({
    where: { id },
    data: { competencesEvaluees, statut: 'TERMINEE' },
    include: INCLUDE_PFMP,
  });
};

// ─── Validation → met à jour CompetenceEleve ─────────────────────────────────

export const validerPfmp = async (id) => {
  const pfmp = await obtenirPfmp(id);
  if (pfmp.statut !== 'TERMINEE')
    throw erreur('La PFMP doit être à l\'état TERMINEE pour être validée', 400);

  const competences = Array.isArray(pfmp.competencesEvaluees) ? pfmp.competencesEvaluees : [];

  await prisma.$transaction(async (tx) => {
    await tx.pfmp.update({ where: { id }, data: { statut: 'VALIDEE' } });

    for (const comp of competences) {
      const niveau = comp.niveauEnseignant ?? comp.niveauTuteur;
      if (!comp.competenceId || !niveau) continue;
      await tx.competenceEleve.upsert({
        where: { eleveId_competenceId: { eleveId: pfmp.eleveId, competenceId: comp.competenceId } },
        create: { eleveId: pfmp.eleveId, competenceId: comp.competenceId, niveau },
        update: { niveau },
      });
    }
  });

  return prisma.pfmp.findUnique({ where: { id }, include: INCLUDE_PFMP });
};

// ─── Suppression ─────────────────────────────────────────────────────────────

export const supprimerPfmp = async (id) => {
  await obtenirPfmp(id);
  await prisma.pfmp.delete({ where: { id } });
};

// ─── Compétences disponibles pour une PFMP (issues de la filière de la classe) ─

export const competencesPourPfmp = async (classeId) => {
  const classe = await prisma.classe.findUnique({ where: { id: classeId } });
  if (!classe) throw erreur('Classe introuvable', 404);

  return prisma.competence.findMany({
    include: { matiere: { select: { id: true, code: true, nom: true } } },
    orderBy: [{ matiereId: 'asc' }, { code: 'asc' }],
  });
};
