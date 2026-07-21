-- AlterTable
ALTER TABLE "File"
ADD COLUMN "originalName" TEXT;

-- AlterTable
ALTER TABLE "Feedback"
ADD COLUMN "referenceCode" TEXT,
ADD COLUMN "reply" TEXT,
ADD COLUMN "repliedAt" TIMESTAMP(3),
ADD COLUMN "repliedBy" TEXT;

-- Backfill any pre-existing rows so the NOT NULL + UNIQUE constraints below can be
-- applied. New rows get their code from the application.
UPDATE "Feedback"
SET "referenceCode" = 'LPR-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 5))
WHERE "referenceCode" IS NULL;

-- AlterTable
ALTER TABLE "Feedback"
ALTER COLUMN "referenceCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_referenceCode_key" ON "Feedback"("referenceCode");
