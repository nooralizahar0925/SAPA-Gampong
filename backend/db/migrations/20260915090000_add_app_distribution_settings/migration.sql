ALTER TABLE "AppConfig"
ADD COLUMN "appDistributionChannel" TEXT NOT NULL DEFAULT 'direct_apk',
ADD COLUMN "appDownloadEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "appApkUrl" TEXT,
ADD COLUMN "appPlayStoreUrl" TEXT,
ADD COLUMN "appVersionName" TEXT,
ADD COLUMN "appReleaseDate" TEXT,
ADD COLUMN "appFileSize" TEXT,
ADD COLUMN "appSha256" TEXT,
ADD COLUMN "appDownloadNotice" TEXT;
