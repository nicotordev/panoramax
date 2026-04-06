-- CreateEnum
CREATE TYPE "TranslationLocale" AS ENUM ('de', 'en', 'es', 'es419', 'fr', 'it', 'zh');

-- CreateTable
CREATE TABLE "event_translations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "locale" "TranslationLocale" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "summary" TEXT,
    "description" TEXT,
    "date_text" TEXT,
    "venue_name" TEXT,
    "location_notes" TEXT,
    "price_text" TEXT,
    "availability_text" TEXT,
    "auto_translated" BOOLEAN NOT NULL DEFAULT false,
    "source_locale" TEXT,
    "provider" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_tier_translations" (
    "id" UUID NOT NULL,
    "event_tier_id" UUID NOT NULL,
    "locale" "TranslationLocale" NOT NULL,
    "name" TEXT,
    "raw_text" TEXT,
    "auto_translated" BOOLEAN NOT NULL DEFAULT false,
    "source_locale" TEXT,
    "provider" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_tier_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_translations_locale_idx" ON "event_translations"("locale");

-- CreateIndex
CREATE INDEX "event_translations_event_id_idx" ON "event_translations"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_translations_event_id_locale_key" ON "event_translations"("event_id", "locale");

-- CreateIndex
CREATE INDEX "event_tier_translations_locale_idx" ON "event_tier_translations"("locale");

-- CreateIndex
CREATE INDEX "event_tier_translations_event_tier_id_idx" ON "event_tier_translations"("event_tier_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_tier_translations_event_tier_id_locale_key" ON "event_tier_translations"("event_tier_id", "locale");

-- AddForeignKey
ALTER TABLE "event_translations" ADD CONSTRAINT "event_translations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_tier_translations" ADD CONSTRAINT "event_tier_translations_event_tier_id_fkey" FOREIGN KEY ("event_tier_id") REFERENCES "event_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
