-- CreateEnum
CREATE TYPE "TypeAbsence" AS ENUM ('ABSENCE', 'RETARD', 'EXCLUSION');

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "enseignantId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "dureeHeures" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "type" "TypeAbsence" NOT NULL DEFAULT 'ABSENCE',
    "motif" TEXT,
    "justifiee" BOOLEAN NOT NULL DEFAULT false,
    "justificatif" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
