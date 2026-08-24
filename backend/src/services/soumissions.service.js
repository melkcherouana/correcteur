import prisma from '../utils/prisma.js';
import { corrigerDevoir } from './ia.service.js';
import { creerNotification } from './notifications.service.js';

// Convertit un score IA (ratio 0-1) en palier 1-4
const pctEnPalier = (ratio) => {
  if (ratio >= 0.85) return 4; // Expert
  if (ratio >= 0.65) return 3; // Averti
  if (ratio >= 0.40) return 2; // Débrouillé
  return 1;                     // Novice
};

// Même mapping que notes.service.js — NON_ACQUIS=Novice, EN_COURS=Débrouillé, ACQUIS=Averti, DEPASSE=Expert
const PALIER_NIVEAU = { 1: 'NON_ACQUIS', 2: 'EN_COURS', 3: 'ACQUIS', 4: 'DEPASSE' };

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

const CHAMPS_PUBLICS = {
  id: true, fichierNom: true, fichierType: true, taille: true,
  corrigeeIA: true, resultatIA: true, createdAt: true, updatedAt: true,
};

// Grille générique quand l'évaluation n'a pas de critères définis
const grilleDefaut = (noteMax) => ({
  criteres: [
    { nom: 'Contenu',     description: 'Qualité, exhaustivité et exactitude du contenu fourni', noteMax: Math.round(noteMax * 0.5) },
    { nom: 'Forme',       description: 'Présentation, organisation et lisibilité du document',   noteMax: Math.round(noteMax * 0.3) },
    { nom: 'Pertinence',  description: 'Adéquation avec les attendus du sujet',                  noteMax: Math.round(noteMax * 0.2) },
  ],
  noteMax,
});

// ─── Dépôt d'un fichier ───────────────────────────────────────────────────────

export const soumettreFichier = async (evaluationId, eleveId, { nom, type, donnees, taille }) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);
  if (evaluation.statut === 'ARCHIVEE') throw erreur('Cette évaluation est archivée', 409);

  return prisma.soumission.upsert({
    where: { evaluationId_eleveId: { evaluationId, eleveId } },
    update: { fichierNom: nom, fichierType: type, fichierData: donnees, taille, corrigeeIA: false, resultatIA: null },
    create: { evaluationId, eleveId, fichierNom: nom, fichierType: type, fichierData: donnees, taille },
    select: { ...CHAMPS_PUBLICS, eleve: { select: { id: true, prenom: true, nom: true } } },
  });
};

// ─── Lecture ──────────────────────────────────────────────────────────────────

export const listerSoumissions = async (evaluationId) =>
  prisma.soumission.findMany({
    where: { evaluationId },
    select: { ...CHAMPS_PUBLICS, eleve: { select: { id: true, prenom: true, nom: true } } },
    orderBy: { createdAt: 'desc' },
  });

export const obtenirMaSoumission = async (evaluationId, eleveId) =>
  prisma.soumission.findUnique({
    where: { evaluationId_eleveId: { evaluationId, eleveId } },
    select: CHAMPS_PUBLICS,
  });

// ─── Correction IA ────────────────────────────────────────────────────────────

export const corrigerSoumissionIA = async (soumissionId) => {
  const soumission = await prisma.soumission.findUnique({
    where: { id: soumissionId },
    include: {
      evaluation: {
        select: {
          titre: true, noteMax: true, description: true, id: true,
          sequence: {
            include: {
              matiere: { include: { competences: true } },
            },
          },
        },
      },
    },
  });
  if (!soumission) throw erreur('Soumission introuvable', 404);

  // Utiliser les compétences du référentiel si l'évaluation est liée à une séquence
  const competences = soumission.evaluation.sequence?.matiere?.competences ?? [];
  const grille = competences.length > 0
    ? {
        criteres: competences.map((c) => ({
          nom: c.code,
          description: c.description,
          noteMax: Math.max(1, Math.round(soumission.evaluation.noteMax / competences.length)),
        })),
        noteMax: soumission.evaluation.noteMax,
      }
    : grilleDefaut(soumission.evaluation.noteMax);

  const { resultat, usage } = await corrigerDevoir(soumission.fichierData, soumission.fichierType, grille);

  // Convertit la note IA en palier 1-4 pour l'upsert dans la grille
  const palier = resultat.noteMax > 0
    ? pctEnPalier(resultat.noteGlobale / resultat.noteMax)
    : null;

  // Compétences liées à cette évaluation (pour la mise à jour automatique de CompetenceEleve)
  const evalCompetences = await prisma.evaluationCompetence.findMany({
    where: { evaluationId: soumission.evaluationId },
    select: { competenceId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.soumission.update({
      where: { id: soumissionId },
      data: { corrigeeIA: true, resultatIA: resultat },
    });

    if (palier !== null) {
      const commentaire = `IA : ${resultat.mention} (${resultat.noteGlobale}/${resultat.noteMax})`;
      const existante = await tx.note.findFirst({
        where: { evaluationId: soumission.evaluationId, eleveId: soumission.eleveId, critereId: null },
      });
      if (existante) {
        await tx.note.update({ where: { id: existante.id }, data: { valeur: palier, commentaire } });
      } else {
        await tx.note.create({
          data: { evaluationId: soumission.evaluationId, eleveId: soumission.eleveId, valeur: palier, commentaire, critereId: null },
        });
      }

      // Mettre à jour CompetenceEleve pour chaque compétence liée à l'évaluation
      const niveau = PALIER_NIVEAU[palier];
      if (niveau && evalCompetences.length > 0) {
        for (const { competenceId } of evalCompetences) {
          await tx.competenceEleve.upsert({
            where: { eleveId_competenceId: { eleveId: soumission.eleveId, competenceId } },
            create: { eleveId: soumission.eleveId, competenceId, niveau },
            update: { niveau },
          });
        }
      }
    }
  });

  // Notifier l'élève que sa correction IA est disponible
  if (palier !== null) {
    const palierLabel = ['Novice', 'Débrouillé', 'Averti', 'Expert'][palier - 1] ?? palier;
    await creerNotification(
      soumission.eleveId,
      'Correction IA disponible',
      `Votre devoir "${soumission.evaluation.titre}" a été corrigé automatiquement — palier : ${palierLabel}.`
    ).catch(() => null);
  }

  return { resultat, usage };
};
