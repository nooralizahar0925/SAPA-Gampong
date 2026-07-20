ALTER TABLE "AdminUser"
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetTokenExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX "AdminUser_passwordResetTokenHash_key" ON "AdminUser"("passwordResetTokenHash");
