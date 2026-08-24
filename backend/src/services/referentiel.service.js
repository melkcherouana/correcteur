import prisma from '../utils/prisma.js';
import { extraireCompetencesPDF } from './ia.service.js';

// ─── Analyse PDF sans sauvegarde ─────────────────────────────────────────────

export const analyserPdfReferentiel = async (buffer) => extraireCompetencesPDF(buffer);

// ─── Import validé en base (avec pôles) ──────────────────────────────────────

export const importerReferentiel = async ({ titre, niveau, poles, matiereExistanteId }) => {
  return prisma.$transaction(async (tx) => {
    let matiereId = matiereExistanteId;

    if (!matiereId) {
      const code = (titre || 'REFERENTIEL')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);

      const matiere = await tx.matiere.create({
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

    // Vérification préalable des codes déjà présents pour cette matière :
    // un `try/catch` autour de la création ne suffit pas pour ignorer un
    // doublon, car dans une transaction Postgres, une contrainte violée
    // avorte TOUTE la transaction (erreur 25P02 « current transaction is
    // aborted ») — les requêtes suivantes échouent même si l'erreur est
    // capturée côté JS. Il faut donc éviter le conflit en amont plutôt que
    // de compter dessus pour l'ignorer après coup.
    const codesExistants = new Set(
      (await tx.competence.findMany({ where: { matiereId }, select: { code: true } }))
        .map((c) => c.code)
    );

    for (let pIdx = 0; pIdx < (poles ?? []).length; pIdx++) {
      const pole = poles[pIdx];

      // Créer le pôle en base
      let poleId = null;
      if (pole.titre || pole.code) {
        const poleCreé = await tx.pole.create({
          data: {
            code: pole.code ?? `P${pIdx + 1}`,
            titre: pole.titre ?? `Pôle ${pIdx + 1}`,
            ordre: pIdx,
            matiereId,
          },
        });
        poleId = poleCreé.id;
      }

      // Créer les compétences liées à ce pôle
      for (let cIdx = 0; cIdx < (pole.competences ?? []).length; cIdx++) {
        const comp = pole.competences[cIdx];
        const code = comp.code || `${pole.code ?? 'C'}${cIdx + 1}`;

        if (codesExistants.has(code)) {
          totalIgnorees++;
          continue;
        }

        const competence = await tx.competence.create({
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
          await tx.critere.create({ data: { description: critere, competenceId: competence.id } });
        }
        totalCreees++;
      }
    }

    const matiere = await tx.matiere.findUnique({
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
  });
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
