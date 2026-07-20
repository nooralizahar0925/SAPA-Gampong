-- AlterTable
ALTER TABLE "PrayerConfig" ADD COLUMN     "aladhanMethod" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN     "fajrAngle" DOUBLE PRECISION NOT NULL DEFAULT 20,
ADD COLUMN     "fallbackAshar" TEXT,
ADD COLUMN     "fallbackDhuhur" TEXT,
ADD COLUMN     "fallbackIsya" TEXT,
ADD COLUMN     "fallbackMaghrib" TEXT,
ADD COLUMN     "fallbackSubuh" TEXT,
ADD COLUMN     "ishaAngle" DOUBLE PRECISION NOT NULL DEFAULT 18,
ADD COLUMN     "school" INTEGER NOT NULL DEFAULT 0;
