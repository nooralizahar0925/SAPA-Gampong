CREATE TABLE "SocialMediaLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "iconUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMediaLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SocialMediaLink_active_idx" ON "SocialMediaLink"("active");
CREATE INDEX "SocialMediaLink_order_idx" ON "SocialMediaLink"("order");
