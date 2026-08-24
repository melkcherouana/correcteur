import prisma from '../utils/prisma.js';

// ─── Statistiques globales ────────────────────────────────────────────────────

export const statsGlobales = async () => {
  const maintenant = new Date();

  const [
    totalEleves,
    totalEnseignants,
    totalClasses,
    totalEvaluations,
    totalNotes,
    totalCompetences,
    moyenneNotes,
    distributionNiveaux,
    evalsParType,
    topClasses,
    rawNotesParMois,
  ] = await Promise.all([
    prisma.utilisateur.count({ where: { role: 'ELEVE', actif: true } }),
    prisma.utilisateur.count({ where: { role: 'ENSEIGNANT', actif: true } }),
    prisma.classe.count({ where: { actif: true } }),
    prisma.evaluation.count(),
    prisma.note.count({ where: { valeur: { not: null } } }),
    prisma.competence.count(),

    prisma.note.aggregate({
      where: { valeur: { not: null } },
      _avg: { valeur: true },
    }),

    prisma.competenceEleve.groupBy({
      by: ['niveau'],
      _count: { _all: true },
    }),

    prisma.evaluation.groupBy({
      by: ['type'],
      _count: { _all: true },
      orderBy: { _count: { type: 'desc' } },
    }),

    prisma.classe.findMany({
      where: { actif: true },
      select: {
        id: true,
        nom: true,
        niveau: true,
        _count: { select: { evaluations: true, eleves: true } },
      },
      orderBy: { evaluations: { _count: 'desc' } },
      take: 5,
    }),

    // Notes saisies par mois sur les 6 derniers mois
    prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS mois,
        COUNT(*)::integer AS total
      FROM notes
      WHERE valeur IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `,
  ]);

  // Compléter les mois manquants avec 0
  const notesParMois = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const trouve = rawNotesParMois.find((r) => r.mois === cle);
    notesParMois.push({ mois: cle, total: trouve ? Number(trouve.total) : 0 });
  }

  return {
    totaux: {
      eleves: totalEleves,
      enseignants: totalEnseignants,
      classes: totalClasses,
      evaluations: totalEvaluations,
      notes: totalNotes,
      competences: totalCompetences,
    },
    moyenneGenerale: moyenneNotes._avg.valeur
      ? Math.round(moyenneNotes._avg.valeur * 10) / 10
      : null,
    distributionNiveaux: distributionNiveaux.map((d) => ({
      niveau: d.niveau,
      count: d._count._all,
    })),
    evalsParType: evalsParType.map((e) => ({
      type: e.type,
      count: e._count._all,
    })),
    topClasses,
    notesParMois,
  };
};
