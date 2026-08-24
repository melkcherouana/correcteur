-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ENSEIGNANT', 'ELEVE', 'RTI', 'EXPERT');

-- CreateEnum
CREATE TYPE "TypeEvaluation" AS ENUM ('DEVOIR_SURVEILLE', 'TRAVAUX_PRATIQUES', 'ORAL', 'PROJET', 'CCF');

-- CreateEnum
CREATE TYPE "StatutEvaluation" AS ENUM ('BROUILLON', 'PUBLIEE', 'CORRIGEE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "NiveauCompetence" AS ENUM ('NON_ACQUIS', 'EN_COURS', 'ACQUIS', 'DEPASSE');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ELEVE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "annee" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classe_eleves" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classe_eleves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matiere_enseignants" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matiere_enseignants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competences" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criteres" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "noteMax" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criteres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competences_eleves" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "niveau" "NiveauCompetence" NOT NULL DEFAULT 'NON_ACQUIS',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competences_eleves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "objectifs" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "matiereId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeEvaluation" NOT NULL DEFAULT 'DEVOIR_SURVEILLE',
    "statut" "StatutEvaluation" NOT NULL DEFAULT 'BROUILLON',
    "datePassage" TIMESTAMP(3),
    "noteMax" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sequenceId" TEXT,
    "classeId" TEXT NOT NULL,
    "createurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "valeur" DOUBLE PRECISION,
    "commentaire" TEXT,
    "eleveId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "critereId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "photoUrl" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annees_formation" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annees_formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "eleveId" TEXT NOT NULL,
    "anneeId" TEXT NOT NULL,
    "poleData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "lueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_notes" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "ancienneNote" DOUBLE PRECISION,
    "nouvelleNote" DOUBLE PRECISION,
    "motif" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classes_nom_key" ON "classes"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "classe_eleves_eleveId_key" ON "classe_eleves"("eleveId");

-- CreateIndex
CREATE UNIQUE INDEX "matieres_code_key" ON "matieres"("code");

-- CreateIndex
CREATE UNIQUE INDEX "matiere_enseignants_enseignantId_matiereId_key" ON "matiere_enseignants"("enseignantId", "matiereId");

-- CreateIndex
CREATE UNIQUE INDEX "competences_code_matiereId_key" ON "competences"("code", "matiereId");

-- CreateIndex
CREATE UNIQUE INDEX "competences_eleves_eleveId_competenceId_key" ON "competences_eleves"("eleveId", "competenceId");

-- CreateIndex
CREATE UNIQUE INDEX "notes_eleveId_evaluationId_critereId_key" ON "notes"("eleveId", "evaluationId", "critereId");

-- CreateIndex
CREATE UNIQUE INDEX "profils_utilisateurId_key" ON "profils"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "annees_formation_libelle_key" ON "annees_formation"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "certifications_eleveId_anneeId_key" ON "certifications"("eleveId", "anneeId");

-- AddForeignKey
ALTER TABLE "classe_eleves" ADD CONSTRAINT "classe_eleves_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classe_eleves" ADD CONSTRAINT "classe_eleves_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matiere_enseignants" ADD CONSTRAINT "matiere_enseignants_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matiere_enseignants" ADD CONSTRAINT "matiere_enseignants_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences" ADD CONSTRAINT "competences_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criteres" ADD CONSTRAINT "criteres_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences_eleves" ADD CONSTRAINT "competences_eleves_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competences_eleves" ADD CONSTRAINT "competences_eleves_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_critereId_fkey" FOREIGN KEY ("critereId") REFERENCES "criteres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils" ADD CONSTRAINT "profils_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_anneeId_fkey" FOREIGN KEY ("anneeId") REFERENCES "annees_formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_notes" ADD CONSTRAINT "historique_notes_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_notes" ADD CONSTRAINT "historique_notes_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
