-- CreateTable
CREATE TABLE "LetterTemplate" (
    "id" TEXT NOT NULL,
    "code" "LetterType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subjectIsApplicant" BOOLEAN NOT NULL DEFAULT true,
    "requiredAttachments" TEXT[] NOT NULL,
    "signatory" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetterTemplate_code_key" ON "LetterTemplate"("code");
