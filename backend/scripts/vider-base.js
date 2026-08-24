import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viderBase() {
  console.log('Début de la remise à zéro…\n');

  const etapes = [
    // ── Feuilles (aucune dépendance en aval) ──────────────────────────
    ['HistoriqueNote',    () => prisma.historiqueNote.deleteMany()],
    ['Note',             () => prisma.note.deleteMany()],
    ['Soumission',       () => prisma.soumission.deleteMany()],
    ['CcfDetail',        () => prisma.ccfDetail.deleteMany()],
    ['CompetenceEleve',  () => prisma.competenceEleve.deleteMany()],
    ['Certification',    () => prisma.certification.deleteMany()],
    ['Notification',     () => prisma.notification.deleteMany()],
    ['Absence',          () => prisma.absence.deleteMany()],
    ['Pfmp',             () => prisma.pfmp.deleteMany()],
    // ── Nœuds intermédiaires ─────────────────────────────────────────
    ['Evaluation',       () => prisma.evaluation.deleteMany()],
    ['Sequence',         () => prisma.sequence.deleteMany()],
    ['ClasseEleve',      () => prisma.classeEleve.deleteMany()],
    ['Classe',           () => prisma.classe.deleteMany()],
    ['Critere',          () => prisma.critere.deleteMany()],
    ['Competence',       () => prisma.competence.deleteMany()],
    ['Pole',             () => prisma.pole.deleteMany()],
    ['MatiereEnseignant',() => prisma.matiereEnseignant.deleteMany()],
    ['Matiere',          () => prisma.matiere.deleteMany()],
    // ── Racines ──────────────────────────────────────────────────────
    ['AnneeFormation',   () => prisma.anneeFormation.deleteMany()],
  ];

  for (const [nom, fn] of etapes) {
    const { count } = await fn();
    console.log(`  ✓ ${nom.padEnd(20)} — ${count} ligne(s) supprimée(s)`);
  }

  // Vérification : tous les comptes utilisateurs intacts
  const nbUsers = await prisma.utilisateur.count();
  console.log(`\n✅ Terminé. ${nbUsers} utilisateur(s) conservé(s) intacts.`);
}

viderBase()
  .catch((err) => {
    console.error('\n❌ Erreur :', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
