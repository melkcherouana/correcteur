-- CreateTable
CREATE TABLE "soumissions" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "fichierType" TEXT NOT NULL,
    "fichierData" BYTEA NOT NULL,
    "taille" INTEGER NOT NULL,
    "corrigeeIA" BOOLEAN NOT NULL DEFAULT false,
    "resultatIA" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soumissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "soumissions_evaluationId_eleveId_key" ON "soumissions"("evaluationId", "eleveId");

-- AddForeignKey
ALTER TABLE "soumissions" ADD CONSTRAINT "soumissions_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soumissions" ADD CONSTRAINT "soumissions_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
