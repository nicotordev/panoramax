-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('editorial', 'venue', 'ticketing', 'organizer');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('scheduled', 'cancelled', 'postponed', 'sold_out', 'expired', 'draft');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('adult', 'family', 'kids', 'all_ages');

-- CreateEnum
CREATE TYPE "CategoryPrimary" AS ENUM ('music', 'theatre', 'standup', 'dance', 'festival', 'fair', 'exhibition', 'food_drink', 'family', 'sports', 'workshop', 'special_experience');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_event_id" TEXT,
    "source_url" TEXT NOT NULL,
    "ticket_url" TEXT,
    "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_title" TEXT,
    "raw_payload" JSONB,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "language" TEXT DEFAULT 'es',
    "image_url" TEXT,
    "image_attribution" TEXT,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6),
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "date_text" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'scheduled',
    "venue_name" TEXT NOT NULL,
    "venue_raw" TEXT,
    "address" TEXT,
    "commune" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CL',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "location_notes" TEXT,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "price_min" DECIMAL(12,2),
    "price_max" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "price_text" TEXT,
    "availability_text" TEXT,
    "category_primary" "CategoryPrimary" NOT NULL,
    "category_secondary" TEXT,
    "categories_source" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "Audience",
    "editorial_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dedupe_key" TEXT,
    "canonical_event_id" UUID,
    "quality_score" INTEGER DEFAULT 0,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_status_start_at_idx" ON "events"("status", "start_at");

-- CreateIndex
CREATE INDEX "events_city_commune_start_at_idx" ON "events"("city", "commune", "start_at");

-- CreateIndex
CREATE INDEX "events_category_primary_start_at_idx" ON "events"("category_primary", "start_at");

-- CreateIndex
CREATE INDEX "events_venue_name_start_at_idx" ON "events"("venue_name", "start_at");

-- CreateIndex
CREATE INDEX "events_dedupe_key_idx" ON "events"("dedupe_key");

-- CreateIndex
CREATE INDEX "events_canonical_event_id_idx" ON "events"("canonical_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_source_source_url_key" ON "events"("source", "source_url");

-- CreateIndex
CREATE UNIQUE INDEX "events_source_source_event_id_key" ON "events"("source", "source_event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_canonical_event_id_fkey" FOREIGN KEY ("canonical_event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
