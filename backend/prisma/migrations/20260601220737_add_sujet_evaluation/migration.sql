-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "sujetData" BYTEA,
ADD COLUMN     "sujetNom" TEXT,
ADD COLUMN     "sujetTaille" INTEGER,
ADD COLUMN     "sujetType" TEXT;
