import prisma from '../utils/prisma.js';

// ─── Extraction du pôle depuis le code de compétence ─────────────────────────
// Exemples : "C1.1" → "C1", "P2.3" → "P2", "A3" → "A3"
export const extrairePole = (code) => code.split('.')[0];

// ─── Code court d'affichage ──────────────────────────────────────────────────
// Un import de référentiel peut enregistrer un libellé (« Participer à… ») à la
// place du code : on affiche alors C{numéro du pôle}.{rang dans le pôle}.
const CODE_COURT = /^[A-Z]{0,3}\d+(\.\d+)*[a-z]?$/i;

// Numéro tiré du code du pôle (« P2 » → 2), sinon de son ordre ; 0 si la compétence n'a pas de pôle
const numeroPole = (c) => {
  const n = c.pole?.code?.match(/\d+/)?.[0];
  if (n) return Number(n);
  return c.pole ? c.pole.ordre + 1 : 0;
};

const codeValide = (code) => !!code && code.length <= 8 && CODE_COURT.test(code);

export const ajouterCodesCourts = (competences) => {
  const codesCourts = new Map();
  const codesPris = new Set();
  const parPole = new Map();
  for (const c of competences) {
    const code = c.code?.trim();
    if (codeValide(code)) {
      codesCourts.set(c.id, code);
      codesPris.add(`${c.matiereId}|${code}`);
    }
    const cle = c.pole?.id ?? `matiere:${c.matiereId}`;
    if (!parPole.has(cle)) parPole.set(cle, []);
    parPole.get(cle).push(c);
  }

  // Code généré d'après le rang dans le pôle (ordre du référentiel, puis code),
  // en sautant les codes déjà utilisés par une autre compétence de la matière
  for (const groupe of parPole.values()) {
    groupe
      .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code, 'fr', { numeric: true }))
      .forEach((c, i) => {
        if (codesCourts.has(c.id)) return;
        let rang = i + 1;
        while (codesPris.has(`${c.matiereId}|C${numeroPole(c)}.${rang}`)) rang++;
        const code = `C${numeroPole(c)}.${rang}`;
        codesCourts.set(c.id, code);
        codesPris.add(`${c.matiereId}|${code}`);
      });
  }

  return competences.map((c) => ({ ...c, codeCourt: codesCourts.get(c.id) }));
};

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
      include: {
        matiere: { select: { id: true, code: true, nom: true } },
        pole: { select: { id: true, code: true, titre: true, libelleCourt: true, ordre: true } },
      },
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
    competences:   ajouterCodesCourts(competences),
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
  // updates : [{ eleveId, competenceId, niveau }] — niveau null = retour à « non évalué »
  // (la ligne est supprimée : l'absence de niveau signifie non évalué)
  const resultats = await Promise.all(
    updates.map(({ eleveId, competenceId, niveau }) =>
      niveau == null
        ? prisma.competenceEleve.deleteMany({ where: { eleveId, competenceId } })
        : prisma.competenceEleve.upsert({
            where:  { eleveId_competenceId: { eleveId, competenceId } },
            create: { eleveId, competenceId, niveau },
            update: { niveau },
          })
    )
  );
  return { appliques: resultats.length };
};
