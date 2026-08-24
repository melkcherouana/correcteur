-- CreateEnum
CREATE TYPE "StatutPfmp" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'VALIDEE');

-- CreateTable
CREATE TABLE "pfmps" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "entrepriseNom" TEXT NOT NULL,
    "entrepriseAdresse" TEXT,
    "entrepriseSecteur" TEXT,
    "tuteurNom" TEXT,
    "tuteurEmail" TEXT,
    "tuteurTelephone" TEXT,
    "statut" "StatutPfmp" NOT NULL DEFAULT 'PLANIFIEE',
    "appreciationTuteur" TEXT,
    "appreciationEnseignant" TEXT,
    "noteGlobale" DOUBLE PRECISION,
    "semaines" INTEGER,
    "competencesEvaluees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pfmps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccf_details" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "numSituation" INTEGER NOT NULL DEFAULT 1,
    "contexte" TEXT,
    "competencesCiblees" JSONB,
    "dateJury" TIMESTAMP(3),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ccf_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ccf_details_evaluationId_key" ON "ccf_details"("evaluationId");

-- AddForeignKey
ALTER TABLE "pfmps" ADD CONSTRAINT "pfmps_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pfmps" ADD CONSTRAINT "pfmps_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccf_details" ADD CONSTRAINT "ccf_details_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
