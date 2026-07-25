-- Store per-device notification preferences so mobile toggles can stop FCM
-- delivery server-side instead of only hiding notifications locally.
ALTER TABLE "DeviceToken"
ADD COLUMN "letterStatusNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "feedbackStatusNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "announcementNotifications" BOOLEAN NOT NULL DEFAULT false;
