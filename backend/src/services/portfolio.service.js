import prisma from '../utils/prisma.js';

const erreur = (msg, status) => Object.assign(new Error(msg), { status });

// ─── Portfolio complet d'un élève ─────────────────────────────────────────────

export const obtenirPortfolio = async (eleveId) => {
  const [eleve, notes, competencesEleve, totalReferentiel, totalParMatiereRaw] = await Promise.all([
    prisma.utilisateur.findUnique({
      where: { id: eleveId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        email: true,
        createdAt: true,
        classe: {
          include: {
            classe: true,
          },
        },
      },
    }),
    prisma.note.findMany({
      where: { eleveId },
      include: {
        evaluation: {
          select: {
            id: true,
            titre: true,
            type: true,
            noteMax: true,
            coefficient: true,
            datePassage: true,
            classe: { select: { nom: true } },
            sequence: {
              select: {
                matiere: { select: { id: true, code: true, nom: true, coefficient: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.competenceEleve.findMany({
      where: { eleveId },
      include: {
        competence: {
          include: {
            matiere: { select: { id: true, code: true, nom: true } },
          },
        },
      },
      orderBy: [{ competence: { matiereId: 'asc' } }, { competence: { code: 'asc' } }],
    }),
    prisma.competence.count(),
    prisma.competence.groupBy({ by: ['matiereId'], _count: { _all: true } }),
  ]);

  if (!eleve) throw erreur('Élève introuvable', 404);

  // Index totalCompetences par matiereId (dénominateur correct pour chaque matière)
  const totalParMatiere = Object.fromEntries(
    totalParMatiereRaw.map(({ matiereId, _count }) => [matiereId, _count._all])
  );

  // Moyennes par matière
  const moyennesParMatiere = calculerMoyennesParMatiere(notes);

  // Progression diplôme — dénominateur = toutes les compétences du référentiel
  const progression = calculerProgression(competencesEleve, totalReferentiel);

  // Compétences fragiles
  const fragiles = competencesEleve.filter(
    (ce) => ce.niveau === 'NON_ACQUIS' || ce.niveau === 'EN_COURS'
  );

  // Compétences groupées par matière (avec totalCompetences réel pour chaque matière)
  const competencesParMatiere = grouperParMatiere(competencesEleve, totalParMatiere);

  return {
    eleve: {
      id: eleve.id,
      prenom: eleve.prenom,
      nom: eleve.nom,
      email: eleve.email,
      createdAt: eleve.createdAt,
      classe: eleve.classe?.classe ?? null,
    },
    stats: {
      totalNotes: notes.length,
      totalCompetences: competencesEleve.length,
      ...progression,
    },
    moyennesParMatiere,
    competencesParMatiere,
    competencesFragiles: fragiles.map(mapCompetenceEleve),
    notesRecentes: notes.slice(0, 10).map(mapNote),
  };
};

// ─── Compétences fragiles seules ──────────────────────────────────────────────

export const obtenirCompetencesFragiles = async (eleveId) => {
  const fragiles = await prisma.competenceEleve.findMany({
    where: {
      eleveId,
      niveau: { in: ['NON_ACQUIS', 'EN_COURS'] },
    },
    include: {
      competence: {
        include: {
          matiere: { select: { id: true, code: true, nom: true } },
          criteres: true,
        },
      },
    },
    orderBy: [{ niveau: 'asc' }, { competence: { code: 'asc' } }],
  });

  // Trier : NON_ACQUIS en premier (plus urgents), puis EN_COURS
  const ordre = { NON_ACQUIS: 0, EN_COURS: 1 };
  fragiles.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);

  return fragiles.map(mapCompetenceEleve);
};

// ─── Progression vers le diplôme ──────────────────────────────────────────────

const calculerProgression = (competencesEleve, totalReferentiel = 0) => {
  // Le dénominateur est le total du référentiel ; si inconnu, on replie sur le nombre d'évaluées
  const total = totalReferentiel > 0 ? totalReferentiel : competencesEleve.length;
  if (total === 0) return { acquises: 0, enCours: 0, nonAcquises: 0, total: 0, pourcentage: 0 };

  const acquises = competencesEleve.filter(
    (ce) => ce.niveau === 'ACQUIS' || ce.niveau === 'DEPASSE'
  ).length;
  const enCours = competencesEleve.filter((ce) => ce.niveau === 'EN_COURS').length;
  const nonAcquises = competencesEleve.filter((ce) => ce.niveau === 'NON_ACQUIS').length;

  return {
    acquises,
    enCours,
    nonAcquises,
    total,
    pourcentage: Math.round((acquises / total) * 100),
  };
};

// ─── Moyennes par matière ─────────────────────────────────────────────────────

const calculerMoyennesParMatiere = (notes) => {
  const parMatiere = {};

  for (const note of notes) {
    if (note.valeur === null) continue;
    const matiere = note.evaluation.sequence?.matiere;
    if (!matiere) continue;

    if (!parMatiere[matiere.id]) {
      parMatiere[matiere.id] = {
        matiere: { id: matiere.id, code: matiere.code, nom: matiere.nom },
        somme: 0,
        count: 0,
        noteMax: 0,
        notes: [],
      };
    }

    // Palier (1-4) stocké pour une éval avec noteMax > 4 : ramener sur /20 correctement
    const estPalier = Number.isInteger(note.valeur) && note.valeur >= 1 && note.valeur <= 4 && note.evaluation.noteMax > 4;
    const normalise = estPalier ? (note.valeur / 4) * 20 : (note.valeur / note.evaluation.noteMax) * 20;
    parMatiere[matiere.id].somme += normalise;
    parMatiere[matiere.id].count++;
    parMatiere[matiere.id].noteMax = Math.max(parMatiere[matiere.id].noteMax, note.evaluation.noteMax);
  }

  return Object.values(parMatiere).map(({ matiere, somme, count }) => ({
    matiere,
    moyenne: count > 0 ? Math.round((somme / count) * 10) / 10 : null,
    nombreNotes: count,
  }));
};

// ─── Grouper compétences par matière ─────────────────────────────────────────

const grouperParMatiere = (competencesEleve, totalParMatiere = {}) => {
  const parMatiere = {};

  for (const ce of competencesEleve) {
    const mId = ce.competence.matiere.id;
    if (!parMatiere[mId]) {
      parMatiere[mId] = {
        matiere: ce.competence.matiere,
        competences: [],
        stats: { ACQUIS: 0, DEPASSE: 0, EN_COURS: 0, NON_ACQUIS: 0 },
        // Dénominateur correct = toutes les compétences de cette matière dans le référentiel
        totalCompetences: totalParMatiere[mId] ?? 0,
      };
    }
    parMatiere[mId].competences.push(mapCompetenceEleve(ce));
    parMatiere[mId].stats[ce.niveau]++;
  }

  return Object.values(parMatiere);
};

// ─── Mappeurs ─────────────────────────────────────────────────────────────────

const mapCompetenceEleve = (ce) => ({
  id: ce.id,
  niveau: ce.niveau,
  updatedAt: ce.updatedAt,
  competence: {
    id: ce.competence.id,
    code: ce.competence.code,
    description: ce.competence.description,
    matiere: ce.competence.matiere,
  },
});

const mapNote = (n) => ({
  id: n.id,
  valeur: n.valeur,
  commentaire: n.commentaire,
  createdAt: n.createdAt,
  evaluation: {
    id: n.evaluation.id,
    titre: n.evaluation.titre,
    type: n.evaluation.type,
    noteMax: n.evaluation.noteMax,
    datePassage: n.evaluation.datePassage,
    classe: n.evaluation.classe,
  },
});
