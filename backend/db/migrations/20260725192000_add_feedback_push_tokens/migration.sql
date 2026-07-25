-- Link resident device tokens to feedback reports so report updates can send push notifications.
CREATE TABLE "FeedbackPushToken" (
    "feedbackId" TEXT NOT NULL,
    "deviceTokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackPushToken_pkey" PRIMARY KEY ("feedbackId","deviceTokenId")
);

CREATE INDEX "FeedbackPushToken_deviceTokenId_idx" ON "FeedbackPushToken"("deviceTokenId");

ALTER TABLE "FeedbackPushToken"
ADD CONSTRAINT "FeedbackPushToken_feedbackId_fkey"
FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackPushToken"
ADD CONSTRAINT "FeedbackPushToken_deviceTokenId_fkey"
FOREIGN KEY ("deviceTokenId") REFERENCES "DeviceToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
