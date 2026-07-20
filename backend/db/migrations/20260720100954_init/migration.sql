-- CreateEnum
CREATE TYPE "LetterType" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'GENERATED', 'SENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('KTP', 'KK', 'other', 'photo', 'document');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'read', 'responded');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'approver');

-- CreateEnum
CREATE TYPE "DemographicBlockType" AS ENUM ('number', 'split', 'bar', 'pie');

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetterRequest" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "letterType" "LetterType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "keperluan" TEXT,
    "subjectData" JSONB NOT NULL,
    "nomorSurat" TEXT,
    "decidedBy" TEXT,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "generatedPdfId" TEXT,
    "verificationToken" TEXT,
    "pdfHash" TEXT,
    "qrRevoked" BOOLEAN NOT NULL DEFAULT false,
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LetterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetterNumberCounter" (
    "letterType" "LetterType" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LetterNumberCounter_pkey" PRIMARY KEY ("letterType","year")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "body" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'new',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerSlide" (
    "id" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL,
    "linkUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),

    CONSTRAINT "BannerSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "foundedDate" TEXT,
    "kecamatan" TEXT NOT NULL,
    "kabupaten" TEXT NOT NULL,
    "contactPhone" TEXT,
    "email" TEXT,
    "mapLat" DOUBLE PRECISION,
    "mapLng" DOUBLE PRECISION,
    "description" TEXT,
    "photoFileId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VillageProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionMission" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "vision" TEXT NOT NULL,
    "missions" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Official" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "photoFileId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isLeadershipHighlight" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Official_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VillageStrength" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "photoFileId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VillageStrength_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mosque" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landmark" TEXT,
    "photoFileId" TEXT,

    CONSTRAINT "Mosque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "calcMethod" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemographicStatBlock" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "DemographicBlockType" NOT NULL,
    "data" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DemographicStatBlock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetterRequest_referenceCode_key" ON "LetterRequest"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "LetterRequest_verificationToken_key" ON "LetterRequest"("verificationToken");

-- CreateIndex
CREATE INDEX "LetterRequest_status_idx" ON "LetterRequest"("status");

-- CreateIndex
CREATE INDEX "LetterRequest_letterType_idx" ON "LetterRequest"("letterType");

-- CreateIndex
CREATE INDEX "LetterRequest_createdAt_idx" ON "LetterRequest"("createdAt");

-- CreateIndex
CREATE INDEX "RequestAttachment_requestId_idx" ON "RequestAttachment"("requestId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_feedbackId_idx" ON "FeedbackAttachment"("feedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "LetterRequest" ADD CONSTRAINT "LetterRequest_generatedPdfId_fkey" FOREIGN KEY ("generatedPdfId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LetterRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerSlide" ADD CONSTRAINT "BannerSlide_imageFileId_fkey" FOREIGN KEY ("imageFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageProfile" ADD CONSTRAINT "VillageProfile_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Official" ADD CONSTRAINT "Official_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VillageStrength" ADD CONSTRAINT "VillageStrength_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mosque" ADD CONSTRAINT "Mosque_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
