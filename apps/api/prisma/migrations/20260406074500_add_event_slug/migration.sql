ALTER TABLE "events"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
