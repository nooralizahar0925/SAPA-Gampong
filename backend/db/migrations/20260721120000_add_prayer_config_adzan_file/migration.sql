-- AlterTable
ALTER TABLE "PrayerConfig" ADD COLUMN "adzanFileId" TEXT;

-- AddForeignKey
ALTER TABLE "PrayerConfig" ADD CONSTRAINT "PrayerConfig_adzanFileId_fkey"
  FOREIGN KEY ("adzanFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
