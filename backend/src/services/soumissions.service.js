import prisma from '../utils/prisma.js';
import mammoth from 'mammoth';
import { corrigerDevoir, annoterCopie } from './ia.service.js';
import { annoterDocx, estDocx } from './copie-annotee.service.js';
import { genererPdfCopiesCorrigees } from './copies-corrigees-pdf.service.js';
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

// ─── Téléchargement du fichier déposé ─────────────────────────────────────────

export const obtenirFichier = async (soumissionId, utilisateur) => {
  const s = await prisma.soumission.findUnique({
    where: { id: soumissionId },
    select: { fichierNom: true, fichierType: true, fichierData: true, eleveId: true },
  });
  if (!s) throw erreur('Soumission introuvable', 404);
  // Un élève ne peut télécharger que son propre fichier ; enseignant/admin : accès libre
  if (utilisateur.role === 'ELEVE' && s.eleveId !== utilisateur.id) {
    throw erreur('Vous ne pouvez télécharger que votre propre fichier', 403);
  }
  return s;
};

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
      const commentaire = `${resultat.mention} (${resultat.noteGlobale}/${resultat.noteMax})`;
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

  // Notifier l'élève que sa correction est disponible
  if (palier !== null) {
    const palierLabel = ['Novice', 'Débrouillé', 'Averti', 'Expert'][palier - 1] ?? palier;
    await creerNotification(
      soumission.eleveId,
      'Correction disponible',
      `Votre devoir "${soumission.evaluation.titre}" a été corrigé automatiquement — palier : ${palierLabel}.`,
      soumission.evaluationId
    ).catch(() => null);
  }

  return { resultat, usage };
};

// ─── Export des copies corrigées (Word annoté + PDF fusionné) ─────────────────

const SUJET_ANALYSABLE = (type) =>
  type === 'application/pdf' || type?.includes('wordprocessingml');

const chargerEvaluationExport = async (evaluationId) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: {
      id: true, titre: true, description: true, noteMax: true, datePassage: true,
      sujetType: true, sujetData: true,
      classe: { select: { nom: true } },
      sequence: { select: { matiere: { select: { nom: true } } } },
      createur: { select: { prenom: true, nom: true } },
    },
  });
  if (!evaluation) throw erreur('Évaluation introuvable', 404);
  return evaluation;
};

// Raison pour laquelle une copie ne peut pas être annotée (null si elle peut l'être)
const raisonExclusion = (s) => {
  if (!s.corrigeeIA || !s.resultatIA) return 'copie pas encore corrigée';
  if (!estDocx(s.fichierType, s.fichierNom)) return 'format non pris en charge (seuls les fichiers .docx sont annotés)';
  return null;
};

// Analyse détaillée de la copie (erreurs localisées), mise en cache dans resultatIA :
// elle est invalidée automatiquement par un nouveau dépôt ou une nouvelle correction.
const obtenirAnalyse = async (soumission, evaluation, { forcer = false } = {}) => {
  if (!forcer && soumission.resultatIA.annotationsCopie) return soumission.resultatIA.annotationsCopie;

  const { value: texteCopie } = await mammoth.extractRawText({ buffer: Buffer.from(soumission.fichierData) });
  if (!texteCopie.trim()) throw erreur('La copie Word ne contient pas de texte à annoter', 422);

  const sujet = evaluation.sujetData && SUJET_ANALYSABLE(evaluation.sujetType)
    ? { buffer: Buffer.from(evaluation.sujetData), mimeType: evaluation.sujetType }
    : null;
  const { resultat } = await annoterCopie({
    texteCopie,
    sujet,
    resultat: soumission.resultatIA,
    contexte: { titre: evaluation.titre, description: evaluation.description },
  });

  const analyse = { ...resultat, genereeLe: new Date().toISOString() };
  const { annotationsCopie: _ancienne, ...resultatIA } = soumission.resultatIA;
  await prisma.soumission.update({
    where: { id: soumission.id },
    data: { resultatIA: { ...resultatIA, annotationsCopie: analyse } },
  });
  soumission.resultatIA = { ...resultatIA, annotationsCopie: analyse };
  return analyse;
};

const chargerSoumissionExport = async (evaluationId, soumissionId) => {
  const s = await prisma.soumission.findUnique({
    where: { id: soumissionId },
    include: { eleve: { select: { id: true, prenom: true, nom: true } } },
  });
  if (!s || s.evaluationId !== evaluationId) throw erreur('Soumission introuvable', 404);
  const raison = raisonExclusion(s);
  if (raison) throw erreur(`Impossible d'annoter cette copie : ${raison}`, 409);
  return s;
};

const auteurAnnotations = (evaluation) =>
  evaluation.createur ? `${evaluation.createur.prenom} ${evaluation.createur.nom}` : 'Enseignant';

const annoterUneCopie = async (soumission, evaluation) => {
  const analyse = await obtenirAnalyse(soumission, evaluation);
  return annoterDocx(Buffer.from(soumission.fichierData), {
    analyse,
    resultat: soumission.resultatIA,
    auteur: auteurAnnotations(evaluation),
  });
};

// Prépare (ou régénère) l'analyse d'une copie — appelé copie par copie depuis l'interface
export const analyserCopieIA = async (evaluationId, soumissionId, { forcer = false } = {}) => {
  const [evaluation, soumission] = await Promise.all([
    chargerEvaluationExport(evaluationId),
    chargerSoumissionExport(evaluationId, soumissionId),
  ]);
  const analyse = await obtenirAnalyse(soumission, evaluation, { forcer });
  const erreurs = (analyse.annotations ?? []).filter((a) => a.categorie !== 'correct').length;
  return { soumissionId, erreurs, pointsCorrects: (analyse.annotations ?? []).length - erreurs };
};

// Copie Word annotée d'un élève
export const genererCopieAnnotee = async (evaluationId, soumissionId) => {
  const [evaluation, soumission] = await Promise.all([
    chargerEvaluationExport(evaluationId),
    chargerSoumissionExport(evaluationId, soumissionId),
  ]);
  const { buffer } = await annoterUneCopie(soumission, evaluation);
  return { nom: soumission.fichierNom.replace(/\.docx$/i, '') + '_corrigé.docx', buffer };
};

// PDF unique : page de garde + toutes les copies annotées
export const genererPdfCopies = async (evaluationId) => {
  const evaluation = await chargerEvaluationExport(evaluationId);
  const soumissions = await prisma.soumission.findMany({
    where: { evaluationId },
    include: { eleve: { select: { id: true, prenom: true, nom: true } } },
  });
  soumissions.sort((a, b) => `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(`${b.eleve.nom} ${b.eleve.prenom}`, 'fr'));

  const copies = [];
  const ignorees = [];
  for (const s of soumissions) {
    const raison = raisonExclusion(s);
    if (raison) {
      ignorees.push({ eleve: s.eleve, raison });
      continue;
    }
    try {
      const { modele } = await annoterUneCopie(s, evaluation);
      copies.push({ eleve: s.eleve, resultat: s.resultatIA, fichierNom: s.fichierNom, modele });
    } catch (err) {
      ignorees.push({ eleve: s.eleve, raison: `annotation impossible (${err.message})` });
    }
  }
  if (!copies.length) throw erreur('Aucune copie Word corrigée à exporter', 409);

  return {
    nom: `Copies corrigées - ${evaluation.titre}.pdf`,
    buffer: await genererPdfCopiesCorrigees({ evaluation, copies, ignorees }),
  };
};
