import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSaufReferentiel() {
  console.log('Réinitialisation de la base (référentiel conservé)…\n');

  const etapes = [
    // ── Feuilles (aucune dépendance en aval) ──────────────────────────
    ['HistoriqueNote',       () => prisma.historiqueNote.deleteMany()],
    ['Note',                 () => prisma.note.deleteMany()],
    ['Soumission',           () => prisma.soumission.deleteMany()],
    ['CcfDetail',            () => prisma.ccfDetail.deleteMany()],
    ['EvaluationCompetence', () => prisma.evaluationCompetence.deleteMany()],
    ['Certification',        () => prisma.certification.deleteMany()],
    ['Notification',         () => prisma.notification.deleteMany()],
    ['Absence',              () => prisma.absence.deleteMany()],
    ['Pfmp',                 () => prisma.pfmp.deleteMany()],
    ['CompetenceEleve',      () => prisma.competenceEleve.deleteMany()],
    // ── Nœuds intermédiaires ─────────────────────────────────────────
    ['Evaluation',           () => prisma.evaluation.deleteMany()],
    ['Sequence',             () => prisma.sequence.deleteMany()],
    ['ClasseEleve',          () => prisma.classeEleve.deleteMany()],
    ['Classe',               () => prisma.classe.deleteMany()],
    ['MatiereEnseignant',    () => prisma.matiereEnseignant.deleteMany()],
    // ── Racines ──────────────────────────────────────────────────────
    ['AnneeFormation',       () => prisma.anneeFormation.deleteMany()],
  ];

  for (const [nom, fn] of etapes) {
    const { count } = await fn();
    console.log(`  ✓ ${nom.padEnd(20)} — ${count} ligne(s) supprimée(s)`);
  }

  // Référentiel conservé : Matiere, Pole, Competence, Critere.
  // Utilisateur et Profil conservés également.
  const [nbUsers, nbMatieres, nbCompetences, nbCriteres] = await Promise.all([
    prisma.utilisateur.count(),
    prisma.matiere.count(),
    prisma.competence.count(),
    prisma.critere.count(),
  ]);
  console.log(
    `\n✅ Terminé. ${nbUsers} utilisateur(s), ${nbMatieres} matière(s), ` +
    `${nbCompetences} compétence(s) et ${nbCriteres} critère(s) du référentiel conservés intacts.`
  );
}

resetSaufReferentiel()
  .catch((err) => {
    console.error('\n❌ Erreur :', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
