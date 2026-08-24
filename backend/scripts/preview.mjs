import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const tables = [
  ["Utilisateurs (CONSERVES)", () => prisma.utilisateur.count()],
  ["HistoriqueNote",           () => prisma.historiqueNote.count()],
  ["Note",                     () => prisma.note.count()],
  ["Soumission",               () => prisma.soumission.count()],
  ["CcfDetail",                () => prisma.ccfDetail.count()],
  ["CompetenceEleve",          () => prisma.competenceEleve.count()],
  ["Certification",            () => prisma.certification.count()],
  ["Notification",             () => prisma.notification.count()],
  ["Absence",                  () => prisma.absence.count()],
  ["Pfmp",                     () => prisma.pfmp.count()],
  ["Evaluation",               () => prisma.evaluation.count()],
  ["Sequence",                 () => prisma.sequence.count()],
  ["ClasseEleve",              () => prisma.classeEleve.count()],
  ["Classe",                   () => prisma.classe.count()],
  ["Critere",                  () => prisma.critere.count()],
  ["Competence",               () => prisma.competence.count()],
  ["Pole",                     () => prisma.pole.count()],
  ["MatiereEnseignant",        () => prisma.matiereEnseignant.count()],
  ["Matiere",                  () => prisma.matiere.count()],
  ["AnneeFormation",           () => prisma.anneeFormation.count()],
];

async function main() {
  console.log("Etat actuel de la base :");
  for (const [nom, fn] of tables) {
    const n = await fn();
    console.log(`  ${nom.padEnd(28)}: ${n}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
