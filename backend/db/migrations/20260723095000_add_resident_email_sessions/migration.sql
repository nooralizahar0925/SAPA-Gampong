CREATE TABLE "ResidentEmailSession" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "sessionTokenHash" TEXT,
    "sessionExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentEmailSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResidentEmailSession_email_key" ON "ResidentEmailSession"("email");
CREATE UNIQUE INDEX "ResidentEmailSession_sessionTokenHash_key" ON "ResidentEmailSession"("sessionTokenHash");
CREATE INDEX "ResidentEmailSession_sessionTokenHash_idx" ON "ResidentEmailSession"("sessionTokenHash");
CREATE INDEX "ResidentEmailSession_sessionExpiresAt_idx" ON "ResidentEmailSession"("sessionExpiresAt");
