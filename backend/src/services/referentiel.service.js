import prisma from '../utils/prisma.js';
import { extraireCompetencesPDF } from './ia.service.js';

// ─── Analyse PDF sans sauvegarde ─────────────────────────────────────────────

export const analyserPdfReferentiel = async (buffer) => extraireCompetencesPDF(buffer);

// ─── Import validé en base (avec pôles) ──────────────────────────────────────

export const importerReferentiel = async ({ titre, niveau, poles, matiereExistanteId }) => {
  let matiereId = matiereExistanteId;

  if (!matiereId) {
    const code = (titre || 'REFERENTIEL')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);

    const matiere = await prisma.matiere.create({
      data: {
        code,
        nom: titre || 'Référentiel importé',
        description: `Référentiel ${niveau ?? 'BAC PRO'} — importé automatiquement`,
      },
    });
    matiereId = matiere.id;
  }

  let totalCreees = 0;
  let totalIgnorees = 0;

  // Pas de transaction englobante : $transaction(async (tx) => …) (transactions
  // interactives Prisma) échoue en prod avec « Transaction API error:
  // Transaction not found » derrière le pooler pgbouncer de Supabase (mode
  // transaction, port 6543) — chaque requête peut atterrir sur une connexion
  // physique différente. Sans atomicité, un import relancé après un échec
  // partiel doit pouvoir reprendre sans dupliquer ce qui a déjà été créé :
  // d'où les vérifications de codes déjà présents ci-dessous, pour les
  // compétences comme pour les pôles.
  const codesExistants = new Set(
    (await prisma.competence.findMany({ where: { matiereId }, select: { code: true } }))
      .map((c) => c.code)
  );
  const polesExistants = new Map(
    (await prisma.pole.findMany({ where: { matiereId }, select: { id: true, code: true } }))
      .map((p) => [p.code, p.id])
  );

  for (let pIdx = 0; pIdx < (poles ?? []).length; pIdx++) {
    const pole = poles[pIdx];

    // Créer le pôle en base (ou réutiliser celui déjà créé lors d'une tentative précédente)
    let poleId = null;
    if (pole.titre || pole.code) {
      const codePole = pole.code ?? `P${pIdx + 1}`;
      if (polesExistants.has(codePole)) {
        poleId = polesExistants.get(codePole);
      } else {
        const poleCreé = await prisma.pole.create({
          data: {
            code: codePole,
            titre: pole.titre ?? `Pôle ${pIdx + 1}`,
            ordre: pIdx,
            matiereId,
          },
        });
        poleId = poleCreé.id;
        polesExistants.set(codePole, poleId);
      }
    }

    // Créer les compétences liées à ce pôle
    for (let cIdx = 0; cIdx < (pole.competences ?? []).length; cIdx++) {
      const comp = pole.competences[cIdx];
      const code = comp.code || `${pole.code ?? 'C'}${cIdx + 1}`;

      if (codesExistants.has(code)) {
        totalIgnorees++;
        continue;
      }

      const competence = await prisma.competence.create({
        data: {
          code,
          description: comp.description,
          matiereId,
          poleId,
          ordre: cIdx,
        },
      });
      codesExistants.add(code);

      for (const critere of comp.criteres ?? []) {
        await prisma.critere.create({ data: { description: critere, competenceId: competence.id } });
      }
      totalCreees++;
    }
  }

  const matiere = await prisma.matiere.findUnique({
    where: { id: matiereId },
    include: { _count: { select: { competences: true } } },
  });

  return {
    matiereId,
    matiereNom: matiere?.nom,
    totalCreees,
    totalIgnorees,
    totalPoles: (poles ?? []).length,
  };
};

// ─── Liste des matières avec leurs pôles ─────────────────────────────────────

export const listerMatieres = () =>
  prisma.matiere.findMany({
    select: {
      id: true,
      code: true,
      nom: true,
      poles: {
        select: { id: true, code: true, titre: true, ordre: true },
        orderBy: { ordre: 'asc' },
      },
      // Permet d'avertir avant un import qui ajouterait du contenu à une
      // matière déjà pourvue en compétences (voir EtapeOrganisation côté
      // frontend) plutôt que de dupliquer silencieusement.
      _count: { select: { competences: true } },
    },
    orderBy: { nom: 'asc' },
  });

// ─── Matière avec pôles et compétences (pour sélecteur) ──────────────────────

export const obtenirMatiereAvecArborescence = async (matiereId) => {
  const matiere = await prisma.matiere.findUnique({
    where: { id: matiereId },
    include: {
      poles: {
        include: {
          competences: {
            orderBy: { ordre: 'asc' },
          },
        },
        orderBy: { ordre: 'asc' },
      },
      // Compétences sans pôle
      competences: {
        where: { poleId: null },
        orderBy: { ordre: 'asc' },
      },
    },
  });
  return matiere;
};
