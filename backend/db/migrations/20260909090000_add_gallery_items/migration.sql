CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GalleryItem_active_idx" ON "GalleryItem"("active");
CREATE INDEX "GalleryItem_order_idx" ON "GalleryItem"("order");
CREATE INDEX "GalleryItem_createdAt_idx" ON "GalleryItem"("createdAt");

ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
