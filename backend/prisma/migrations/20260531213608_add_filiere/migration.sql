-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "filiereId" TEXT;

-- CreateTable
CREATE TABLE "filieres" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "filieres_code_key" ON "filieres"("code");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
