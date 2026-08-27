import prisma from '../utils/prisma.js';
import { creerNotification } from './notifications.service.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

// Correspondance palier → NiveauCompetence (NON_ACQUIS=Novice, EN_COURS=Débrouillé, ACQUIS=Averti, DEPASSE=Expert)
const PALIER_NIVEAU = { 1: 'NON_ACQUIS', 2: 'EN_COURS', 3: 'ACQUIS', 4: 'DEPASSE' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const verifierEvaluation = async (evaluationId) => {
  const e = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
  if (!e) throw erreur('Évaluation introuvable', 404);
  return e;
};

const trouverNote = (eleveId, evaluationId, critereId = null) =>
  prisma.note.findFirst({ where: { eleveId, evaluationId, critereId } });

// Crée une entrée d'historique si la valeur change
const enregistrerHistorique = (tx, evaluationId, enseignantId, ancienneNote, nouvelleNote, motif) =>
  tx.historiqueNote.create({
    data: { evaluationId, enseignantId, ancienneNote, nouvelleNote, motif },
  });

// ─── Tableau de bord classe × évaluations ─────────────────────────────────────

export const tableauClasse = async (classeId) => {
  const [eleveRows, evaluations] = await Promise.all([
    prisma.classeEleve.findMany({
      where: { classeId },
      include: { eleve: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { eleve: { nom: 'asc' } },
    }),
    prisma.evaluation.findMany({
      where: { classeId },
      select: { id: true, titre: true, type: true, datePassage: true, noteMax: true },
      orderBy: [{ datePassage: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const eleveIds = eleveRows.map((e) => e.eleveId);
  const evaluationIds = evaluations.map((e) => e.id);

  // critereId: null — seule la note globale de l'évaluation, pas les sous-notes par critère
  const notes = await prisma.note.findMany({
    where: { eleveId: { in: eleveIds }, evaluationId: { in: evaluationIds }, critereId: null },
  });

  const index = {};
  for (const n of notes) {
    (index[n.eleveId] ??= {})[n.evaluationId] = n.valeur;
  }

  return {
    eleves: eleveRows.map((e) => e.eleve),
    evaluations,
    notes: index,
  };
};

// ─── Lecture ─────────────────────────────────────────────────────────────────

export const listerNotes = async ({ eleveId, evaluationId, page = 1, limite = 50 } = {}) => {
  const where = {
    ...(eleveId      && { eleveId }),
    ...(evaluationId && { evaluationId }),
  };

  const [total, notes] = await Promise.all([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      include: {
        evaluation: { select: { id: true, titre: true, type: true, noteMax: true, coefficient: true, datePassage: true } },
        critere:    { select: { id: true, description: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limite,
      take: limite,
    }),
  ]);

  return { notes, total, page, pages: Math.ceil(total / limite) };
};

export const obtenirNote = async (id) => {
  const n = await prisma.note.findUnique({
    where: { id },
    include: {
      eleve:      { select: { id: true, prenom: true, nom: true } },
      evaluation: { select: { id: true, titre: true, noteMax: true } },
      critere:    true,
    },
  });
  if (!n) throw erreur('Note introuvable', 404);
  return n;
};

// ─── Saisie en masse (toute une classe) ──────────────────────────────────────

export const saisirNotesBulk = async (evaluationId, notes, enseignantId) => {
  await verifierEvaluation(evaluationId);

  // Compétences liées à cette évaluation (pour la mise à jour automatique de CompetenceEleve)
  const evalCompetences = await prisma.evaluationCompetence.findMany({
    where: { evaluationId },
    select: { competenceId: true },
  });

  const resultats = { creees: 0, mises_a_jour: 0, notes: [] };

  await prisma.$transaction(async (tx) => {
    for (const { eleveId, valeur, commentaire = null, critereId = null } of notes) {
      const existante = await trouverNote(eleveId, evaluationId, critereId);

      if (existante) {
        // Tracer uniquement si la valeur change réellement
        if (existante.valeur !== valeur) {
          await enregistrerHistorique(
            tx, evaluationId, enseignantId,
            existante.valeur, valeur, 'Correction lors de la saisie'
          );
        }
        const note = await tx.note.update({
          where: { id: existante.id },
          data: { valeur, commentaire },
        });
        resultats.notes.push(note);
        resultats.mises_a_jour++;
      } else {
        const note = await tx.note.create({
          data: { eleveId, evaluationId, valeur, commentaire, critereId },
        });
        resultats.notes.push(note);
        resultats.creees++;
      }

      // Mettre à jour CompetenceEleve pour les notes de niveau évaluation (sans critère)
      if (!critereId && valeur != null && evalCompetences.length > 0) {
        const niveau = PALIER_NIVEAU[Math.round(valeur)];
        if (niveau) {
          for (const { competenceId } of evalCompetences) {
            await tx.competenceEleve.upsert({
              where: { eleveId_competenceId: { eleveId, competenceId } },
              create: { eleveId, competenceId, niveau },
              update: { niveau },
            });
          }
        }
      }
    }
  });

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { titre: true },
  });

  // Notifier chaque élève évalué
  const elevesNotifies = new Set(notes.map((n) => n.eleveId));
  await Promise.all(
    [...elevesNotifies].map((eleveId) =>
      creerNotification(
        eleveId,
        'Nouvelle note disponible',
        `Votre note pour "${evaluation?.titre ?? 'une évaluation'}" a été saisie.`
      ).catch(() => null)
    )
  );

  // Alerte enseignant si des élèves sont en palier Novice (valeur = 1)
  const elevesNovice = notes.filter((n) => n.valeur === 1);
  if (elevesNovice.length > 0 && enseignantId) {
    await creerNotification(
      enseignantId,
      `Élèves en difficulté — ${evaluation?.titre ?? 'évaluation'}`,
      `${elevesNovice.length} élève${elevesNovice.length > 1 ? 's' : ''} ${elevesNovice.length > 1 ? 'ont obtenu' : 'a obtenu'} le palier Novice. Pensez à analyser leurs compétences fragiles.`
    ).catch(() => null);
  }

  return resultats;
};

// ─── Note individuelle ────────────────────────────────────────────────────────

export const creerNote = async ({ eleveId, evaluationId, valeur, commentaire, critereId = null }) => {
  await verifierEvaluation(evaluationId);

  const existante = await trouverNote(eleveId, evaluationId, critereId);
  if (existante) throw erreur('Une note existe déjà pour cet élève sur cette évaluation', 409);

  return prisma.note.create({ data: { eleveId, evaluationId, valeur, commentaire, critereId } });
};

// ─── Correction (motif obligatoire + historique) ──────────────────────────────

export const corrigerNote = async (id, { valeur, commentaire, motif }, enseignantId) => {
  const note = await obtenirNote(id);

  return prisma.$transaction(async (tx) => {
    if (note.valeur !== valeur) {
      await enregistrerHistorique(tx, note.evaluationId, enseignantId, note.valeur, valeur, motif);
    }
    return tx.note.update({
      where: { id },
      data: { valeur, commentaire },
      include: { eleve: { select: { id: true, prenom: true, nom: true } } },
    });
  });
};

export const supprimerNote = async (id) => {
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) throw erreur('Note introuvable', 404);
  await prisma.note.delete({ where: { id } });
};

// ─── Export CSV ───────────────────────────────────────────────────────────────

const PALIER_LABEL = { 1: 'Novice', 2: 'Débrouillé', 3: 'Averti', 4: 'Expert' };

const cellCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const exporterCsv = async ({ eleveId, evaluationId, classeId } = {}) => {
  const where = { valeur: { not: null } };
  if (eleveId)      where.eleveId = eleveId;
  if (evaluationId) where.evaluationId = evaluationId;

  if (classeId && !eleveId && !evaluationId) {
    const membres = await prisma.classeEleve.findMany({
      where: { classeId },
      select: { eleveId: true },
    });
    where.eleveId = { in: membres.map((m) => m.eleveId) };
  }

  const notes = await prisma.note.findMany({
    where,
    include: {
      eleve: { select: { prenom: true, nom: true } },
      evaluation: {
        include: {
          classe:   { select: { nom: true } },
          sequence: { select: { matiere: { select: { nom: true } } } },
        },
      },
    },
    orderBy: [{ eleve: { nom: 'asc' } }, { evaluation: { datePassage: 'asc' } }],
  });

  const entete = ['Nom', 'Prénom', 'Classe', 'Matière', 'Évaluation', 'Type', 'Date', 'Palier', 'Valeur /4', 'Commentaire'];

  const lignes = notes.map((n) => [
    n.eleve.nom,
    n.eleve.prenom,
    n.evaluation.classe?.nom ?? '',
    n.evaluation.sequence?.matiere?.nom ?? '',
    n.evaluation.titre,
    n.evaluation.type,
    n.evaluation.datePassage
      ? new Date(n.evaluation.datePassage).toLocaleDateString('fr-FR')
      : '',
    n.valeur !== null ? (PALIER_LABEL[n.valeur] ?? String(n.valeur)) : 'NE',
    n.valeur !== null ? String(n.valeur) : '',
    n.commentaire ?? '',
  ]);

  return [entete, ...lignes]
    .map((row) => row.map(cellCsv).join(','))
    .join('\r\n');
};
