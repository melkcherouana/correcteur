-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'ENSEIGNANT', 'ELEVE');
ALTER TABLE "utilisateurs" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "utilisateurs" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "utilisateurs" ALTER COLUMN "role" SET DEFAULT 'ELEVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_filiereId_fkey";

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "filiereId";

-- AlterTable
ALTER TABLE "competences" ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "poleId" TEXT;

-- DropTable
DROP TABLE "filieres";

-- CreateTable
CREATE TABLE "poles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "matiereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_competences" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_competences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_competences_evaluationId_competenceId_key" ON "evaluation_competences"("evaluationId", "competenceId");

-- AddForeignKey
ALTER TABLE "poles" ADD CONSTRAINT "poles_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences" ADD CONSTRAINT "competences_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "poles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_competences" ADD CONSTRAINT "evaluation_competences_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_competences" ADD CONSTRAINT "evaluation_competences_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

