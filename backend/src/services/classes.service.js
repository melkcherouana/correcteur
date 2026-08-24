import prisma from '../utils/prisma.js';

const INCLUDE_DETAIL = {
  _count: { select: { eleves: true, evaluations: true } },
};

// Ordre pédagogique d'affichage (aligné sur NIVEAUX du formulaire de création
// de classe — frontend/src/pages/Classes.jsx — et sur NIVEAU_SUIVANT dans
// annees.service.js). Un tri alphabétique classerait "1ère Pro" avant
// "2nde Pro" et éclaterait le cursus Bac Pro. Un niveau non reconnu est
// placé en fin de liste plutôt que de faire échouer le tri.
const ORDRE_NIVEAUX = ['2nde Pro', '1ère Pro', 'Terminale Pro', 'CAP 1', 'CAP 2', 'BTS 1', 'BTS 2'];
const rangNiveau = (niveau) => {
  const i = ORDRE_NIVEAUX.indexOf(niveau);
  return i === -1 ? ORDRE_NIVEAUX.length : i;
};

export const listerClasses = async ({ actif, search } = {}) => {
  const where = {
    ...(actif !== undefined && { actif }),
    ...(search && { nom: { contains: search, mode: 'insensitive' } }),
  };

  const classes = await prisma.classe.findMany({ where, include: INCLUDE_DETAIL });

  return classes.sort(
    (a, b) => rangNiveau(a.niveau) - rangNiveau(b.niveau) || a.nom.localeCompare(b.nom)
  );
};

export const obtenirClasse = async (id) => {
  const c = await prisma.classe.findUnique({
    where: { id },
    include: {
      ...INCLUDE_DETAIL,
      eleves: {
        include: {
          eleve: {
            select: { id: true, prenom: true, nom: true, email: true },
          },
        },
      },
    },
  });
  if (!c) throw Object.assign(new Error('Classe introuvable'), { status: 404 });
  return c;
};

export const creerClasse = async ({ nom, niveau, annee }) => {
  const existante = await prisma.classe.findUnique({ where: { nom } });
  if (existante) throw Object.assign(new Error(`La classe "${nom}" existe déjà`), { status: 409 });

  return prisma.classe.create({
    data: { nom, niveau, annee },
    include: INCLUDE_DETAIL,
  });
};

export const mettreAJourClasse = async (id, donnees) => {
  await obtenirClasse(id);
  return prisma.classe.update({ where: { id }, data: donnees, include: INCLUDE_DETAIL });
};

export const supprimerClasse = async (id) => {
  await obtenirClasse(id);
  await prisma.classe.update({ where: { id }, data: { actif: false } });
};

export const syntheseClasse = async (id) => {
  const classe = await prisma.classe.findUnique({
    where: { id },
    include: {
      eleves: {
        include: { eleve: { select: { id: true, prenom: true, nom: true } } },
        orderBy: { eleve: { nom: 'asc' } },
      },
    },
  });
  if (!classe) throw Object.assign(new Error('Classe introuvable'), { status: 404 });

  const eleveIds = classe.eleves.map((e) => e.eleveId);

  // 1. Chercher les matières liées aux séquences des évaluations de la classe
  const evaluations = await prisma.evaluation.findMany({
    where: { classeId: id, sequence: { isNot: null } },
    select: { sequence: { select: { matiereId: true } } },
  });
  const matiereIds = [...new Set(
    evaluations.map((e) => e.sequence?.matiereId).filter(Boolean)
  )];

  // 2. Charger les pôles + compétences de ces matières
  let poles = [];
  if (matiereIds.length > 0) {
    const polesDB = await prisma.pole.findMany({
      where: { matiereId: { in: matiereIds } },
      include: {
        matiere: { select: { id: true, nom: true, code: true } },
        competences: {
          orderBy: [{ ordre: 'asc' }, { code: 'asc' }],
          select: { id: true, code: true, description: true, ordre: true },
        },
      },
      orderBy: [{ matiereId: 'asc' }, { ordre: 'asc' }],
    });
    poles = polesDB
      .filter((p) => p.competences.length > 0)
      .map((p) => ({
        id: p.id, code: p.code, titre: p.titre,
        matiere: p.matiere, competences: p.competences,
      }));
  }

  // 3. Fallback : si aucune séquence/matière, prendre les compétences évaluées des élèves
  if (poles.length === 0) {
    const compEleveIds = await prisma.competenceEleve.findMany({
      where: { eleveId: { in: eleveIds } },
      select: { competenceId: true },
      distinct: ['competenceId'],
    });
    const compIds = compEleveIds.map((ce) => ce.competenceId);
    if (compIds.length > 0) {
      const polesSet = {};
      const comps = await prisma.competence.findMany({
        where: { id: { in: compIds } },
        include: {
          pole: { include: { matiere: { select: { id: true, nom: true, code: true } } } },
          matiere: { select: { id: true, nom: true, code: true } },
        },
      });
      for (const comp of comps) {
        const pKey = comp.poleId ?? `__${comp.matiereId}`;
        if (!polesSet[pKey]) {
          polesSet[pKey] = {
            id: pKey,
            code: comp.pole?.code ?? '',
            titre: comp.pole?.titre ?? 'Compétences',
            ordre: comp.pole?.ordre ?? 0,
            matiere: comp.pole?.matiere ?? comp.matiere,
            competences: [],
          };
        }
        polesSet[pKey].competences.push({
          id: comp.id, code: comp.code,
          description: comp.description, ordre: comp.ordre,
        });
      }
      poles = Object.values(polesSet)
        .sort((a, b) => a.ordre - b.ordre)
        .map((p) => ({
          ...p,
          competences: p.competences.sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code)),
        }));
    }
  }

  // 4. Niveaux de compétences par élève
  const compEleveRows = await prisma.competenceEleve.findMany({
    where: { eleveId: { in: eleveIds } },
    select: { eleveId: true, competenceId: true, niveau: true },
  });
  const niveaux = Object.fromEntries(eleveIds.map((eid) => [eid, {}]));
  for (const ce of compEleveRows) {
    if (niveaux[ce.eleveId]) niveaux[ce.eleveId][ce.competenceId] = ce.niveau;
  }

  return {
    classe: { id: classe.id, nom: classe.nom, niveau: classe.niveau },
    eleves: classe.eleves.map((e) => e.eleve),
    poles,
    niveaux,
  };
};
