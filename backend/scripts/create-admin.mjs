import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

const hash = await bcrypt.hash("Admin1234!", 12);
const admin = await prisma.utilisateur.upsert({
  where: { email: "admin@evalpro.fr" },
  update: { role: "ADMIN", actif: true, motDePasse: hash },
  create: {
    email: "admin@evalpro.fr",
    motDePasse: hash,
    prenom: "Admin",
    nom: "EvalPro",
    role: "ADMIN",
  },
});
console.log("Compte créé :", admin.email, "— rôle :", admin.role);
await prisma.$disconnect();
