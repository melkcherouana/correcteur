-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "evaluationId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_evaluationId_idx" ON "notifications"("evaluationId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
