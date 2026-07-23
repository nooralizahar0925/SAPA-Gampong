CREATE TYPE "PushPlatform" AS ENUM ('android', 'ios', 'web', 'unknown');

CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" "PushPlatform" NOT NULL DEFAULT 'unknown',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequestPushToken" (
  "requestId" TEXT NOT NULL,
  "deviceTokenId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RequestPushToken_pkey" PRIMARY KEY ("requestId", "deviceTokenId")
);

CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_active_idx" ON "DeviceToken"("active");
CREATE INDEX "RequestPushToken_deviceTokenId_idx" ON "RequestPushToken"("deviceTokenId");

ALTER TABLE "RequestPushToken"
  ADD CONSTRAINT "RequestPushToken_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "LetterRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestPushToken"
  ADD CONSTRAINT "RequestPushToken_deviceTokenId_fkey"
  FOREIGN KEY ("deviceTokenId") REFERENCES "DeviceToken"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
