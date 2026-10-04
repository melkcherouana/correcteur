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

// ─── Compétences de la grille de synthèse ────────────────────────────────────
// Requête commune à la grille et au PDF de profil de certification

const chargerCompetencesGrille = async (matiereId) =>
  ajouterCodesCourts(await prisma.competence.findMany({
    where: matiereId ? { matiereId } : {},
    include: {
      matiere: { select: { id: true, code: true, nom: true } },
      pole: { select: { id: true, code: true, titre: true, libelleCourt: true, ordre: true } },
    },
    orderBy: [{ matiereId: 'asc' }, { code: 'asc' }],
  }));

// ─── Libellé court et regroupement par pôle ──────────────────────────────────
// Mêmes règles que la grille de synthèse (frontend/src/pages/Certification.jsx) :
// 3 mots significatifs, 28 caractères max ; libelle_court enregistré en priorité.

const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'à', 'au', 'aux', 'en', 'et', 'un', 'une', 'pour', 'sur', 'avec',
  'pôle', 'pole', 'compétence', 'competence', 'bloc',
]);
const LONGUEUR_MAX_LIBELLE = 28;

const tronquer = (texte, max = LONGUEUR_MAX_LIBELLE) =>
  texte.length > max ? `${texte.slice(0, max - 1).trimEnd()}…` : texte;

const genererLibelleCourt = (texte = '', nbMots = 3) => {
  const mots = [];
  for (const brut of texte.split(/[\s'’:;,.–—()/]+|\s-\s/)) {
    const mot = brut.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (!mot || /\d/.test(brut) || MOTS_VIDES.has(mot.toLowerCase())) continue;
    mots.push(mots.length ? mot : mot.charAt(0).toUpperCase() + mot.slice(1));
    if (mots.length === nbMots) break;
  }
  return tronquer(mots.join(' '));
};

export const libelleCourt = (enregistre, complet) => tronquer(enregistre?.trim() || genererLibelleCourt(complet ?? ''));

const triNaturel = (a = '', b = '') => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

/**
 * Regroupe les compétences par pôle, dans l'ordre de la grille : numéro de pôle puis code.
 * Pôle du référentiel s'il existe, sinon préfixe du code court (« C1.2 » → « C1 »).
 * @returns {{ cle, libelle, court, titre, competences }[]} libelle = « P1 », court = libellé court du pôle
 */
export const grouperParPole = (competences) => {
  const poles = new Map();
  for (const c of competences) {
    const code = c.pole?.code ?? extrairePole(c.codeCourt ?? c.code);
    const n = Number(code.match(/\d+/)?.[0] ?? NaN);
    const cle = c.pole?.id ?? `code:${code}`;
    if (!poles.has(cle)) {
      const libelle = Number.isFinite(n) ? `P${n}` : code;
      poles.set(cle, {
        cle,
        libelle,
        court: libelleCourt(c.pole?.libelleCourt, c.pole?.titre),
        titre: c.pole?.titre || libelle,
        ordre: Number.isFinite(n) ? n : (c.pole?.ordre ?? Infinity),
        competences: [],
      });
    }
    poles.get(cle).competences.push(c);
  }
  return [...poles.values()]
    .sort((a, b) => a.ordre - b.ordre || triNaturel(a.libelle, b.libelle))
    .map((p) => ({ ...p, competences: p.competences.sort((a, b) => triNaturel(a.codeCourt, b.codeCourt)) }));
};

// ─── Profil de certification d'un élève (données du PDF) ─────────────────────
// Mêmes compétences, pôles, codes et niveaux que la grille de synthèse (toutes matières)

export const profilCertificationEleve = async (eleveId) => {
  const [eleve, competences, niveaux] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { id: eleveId },
      select: { id: true, prenom: true, nom: true, classe: { select: { classe: { select: { id: true, nom: true } } } } },
    }),
    chargerCompetencesGrille(),
    prisma.competenceEleve.findMany({ where: { eleveId }, select: { competenceId: true, niveau: true } }),
  ]);
  if (!eleve) throw Object.assign(new Error('Élève introuvable'), { status: 404 });
  return construireProfil(eleve, competences, niveaux);
};

// Partie sans accès à la base : regroupement par pôle et décompte des acquis (A et D)
export const construireProfil = (eleve, competences, niveaux) => {
  const niveauxIndex = Object.fromEntries(niveaux.map((n) => [n.competenceId, n.niveau]));
  const estAcquise = (c) => ['ACQUIS', 'DEPASSE'].includes(niveauxIndex[c.id]);
  const poles = grouperParPole(competences).map((p) => ({
    ...p,
    competences: p.competences.map((c) => ({
      id: c.id, code: c.codeCourt, description: c.description, niveau: niveauxIndex[c.id] ?? null,
    })),
    acquises: p.competences.filter(estAcquise).length,
  }));
  const acquises = competences.filter(estAcquise).length;

  return {
    // Pas de filière en base : le PDF n'affiche la ligne que si elle est renseignée
    eleve: { prenom: eleve.prenom, nom: eleve.nom, classe: eleve.classe?.classe?.nom ?? null },
    stats: {
      acquises,
      total: competences.length,
      pourcentage: competences.length ? Math.round((acquises / competences.length) * 100) : 0,
    },
    poles,
  };
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
    chargerCompetencesGrille(matiereId),
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
