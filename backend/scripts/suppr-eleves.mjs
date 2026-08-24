import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Compter avant
  const avant = await prisma.utilisateur.groupBy({ by: ["role"], _count: true });
  console.log("Avant :");
  avant.forEach(r => console.log(`  ${r.role.padEnd(12)}: ${r._count}`));

  // Supprimer les élèves (Profil supprimé en cascade)
  const { count } = await prisma.utilisateur.deleteMany({ where: { role: "ELEVE" } });
  console.log(`\nSupprimé : ${count} élève(s)`);

  // Compter après
  const apres = await prisma.utilisateur.groupBy({ by: ["role"], _count: true });
  console.log("\nAprès :");
  apres.forEach(r => console.log(`  ${r.role.padEnd(12)}: ${r._count}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
