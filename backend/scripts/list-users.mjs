import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const users = await prisma.utilisateur.findMany({ select: { email: true, prenom: true, nom: true, role: true } });
users.forEach(u => console.log(`[${u.role.padEnd(10)}] ${u.prenom} ${u.nom} — ${u.email}`));
await prisma.$disconnect();
