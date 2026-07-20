-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('mailersend', 'mailgun', 'gmail');

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "activeEmailProvider" "EmailProvider" NOT NULL DEFAULT 'mailersend',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
