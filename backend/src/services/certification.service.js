import prisma from '../utils/prisma.js';

// ─── Extraction du pôle depuis le code de compétence ─────────────────────────
// Exemples : "C1.1" → "C1", "P2.3" → "P2", "A3" → "A3"
export const extrairePole = (code) => code.split('.')[0];

// ─── Synthèse classe × compétences ───────────────────────────────────────────
// Retourne : élèves, compétences, niveaux certif, paliers moyens par matière

export const syntheseClasse = async (classeId, matiereId) => {
  const [eleveRows, competences] = await Promise.all([
    prisma.classeEleve.findMany({
      where: { classeId },
      include: { eleve: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { eleve: { nom: 'asc' } },
    }),
    prisma.competence.findMany({
      where: matiereId ? { matiereId } : {},
      include: { matiere: { select: { id: true, code: true, nom: true } } },
      orderBy: [{ matiereId: 'asc' }, { code: 'asc' }],
    }),
  ]);

  const eleveIds      = eleveRows.map((e) => e.eleveId);
  const competenceIds = competences.map((c) => c.id);
  const matiereIds    = [...new Set(competences.map((c) => c.matiereId))];

  const [niveaux, notes] = await Promise.all([
    prisma.competenceEleve.findMany({
      where: { eleveId: { in: eleveIds }, competenceId: { in: competenceIds } },
    }),
    matiereIds.length > 0
      ? prisma.note.findMany({
          where: {
            eleveId:   { in: eleveIds },
            valeur:    { not: null },
            evaluation: {
              sequence: { matiereId: { in: matiereIds } },
            },
          },
          select: {
            eleveId: true,
            valeur:  true,
            evaluation: { select: { sequence: { select: { matiereId: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Index niveaux : { eleveId → { competenceId → niveau } }
  const niveauxIndex = {};
  for (const n of niveaux) {
    (niveauxIndex[n.eleveId] ??= {})[n.competenceId] = n.niveau;
  }

  // Paliers moyens : { eleveId → { matiereId → avgPalier } }
  const sommes = {};
  const counts = {};
  for (const note of notes) {
    const mId = note.evaluation?.sequence?.matiereId;
    if (!mId || note.valeur === null) continue;
    (sommes[note.eleveId] ??= {})[mId] = ((sommes[note.eleveId]?.[mId]) ?? 0) + note.valeur;
    (counts[note.eleveId] ??= {})[mId] = ((counts[note.eleveId]?.[mId]) ?? 0) + 1;
  }

  const paliersMoyens = {};
  for (const eId of eleveIds) {
    paliersMoyens[eId] = {};
    for (const mId of matiereIds) {
      const s = sommes[eId]?.[mId];
      const c = counts[eId]?.[mId];
      paliersMoyens[eId][mId] = s != null && c > 0
        ? Math.round((s / c) * 10) / 10
        : null;
    }
  }

  return {
    eleves:        eleveRows.map((e) => e.eleve),
    competences,
    niveaux:       niveauxIndex,
    paliersMoyens,
  };
};

// ─── Suggestion de niveaux depuis les notes ───────────────────────────────────
// Mapping palier moyen → niveau de certification
const palierVersNiveau = (avg) => {
  if (avg === null) return null;
  if (avg < 1.5)  return 'NON_ACQUIS';
  if (avg < 2.5)  return 'EN_COURS';
  if (avg < 3.5)  return 'ACQUIS';
  return 'DEPASSE';
};

export const suggererNiveauxDepuisNotes = async (eleveId) => {
  const [competencesEleve, notes] = await Promise.all([
    prisma.competenceEleve.findMany({
      where: { eleveId },
      include: { competence: { select: { id: true, code: true, matiereId: true, description: true } } },
    }),
    prisma.note.findMany({
      where: { eleveId, valeur: { not: null } },
      select: {
        valeur: true,
        evaluation: { select: { sequence: { select: { matiereId: true } } } },
      },
    }),
  ]);

  // Palier moyen par matière
  const sommesM = {};
  const countsM = {};
  for (const note of notes) {
    const mId = note.evaluation?.sequence?.matiereId;
    if (!mId) continue;
    sommesM[mId] = (sommesM[mId] ?? 0) + note.valeur;
    countsM[mId] = (countsM[mId] ?? 0) + 1;
  }

  const suggestions = competencesEleve.map((ce) => {
    const mId  = ce.competence.matiereId;
    const avg  = countsM[mId] ? sommesM[mId] / countsM[mId] : null;
    return {
      competenceId:   ce.competenceId,
      code:           ce.competence.code,
      description:    ce.competence.description,
      niveauActuel:   ce.niveau,
      niveauSuggere:  palierVersNiveau(avg),
      palierMoyen:    avg !== null ? Math.round(avg * 10) / 10 : null,
    };
  });

  return { eleveId, suggestions };
};

// ─── Mise à jour en masse des niveaux ─────────────────────────────────────────

export const appliquerNiveauxBulk = async (updates) => {
  // updates : [{ eleveId, competenceId, niveau }]
  const resultats = await Promise.all(
    updates.map(({ eleveId, competenceId, niveau }) =>
      prisma.competenceEleve.upsert({
        where:  { eleveId_competenceId: { eleveId, competenceId } },
        create: { eleveId, competenceId, niveau },
        update: { niveau },
      })
    )
  );
  return { appliques: resultats.length };
};
