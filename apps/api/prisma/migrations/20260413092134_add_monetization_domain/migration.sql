-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('organizer', 'ticketing', 'venue', 'brand', 'agency');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('traffic', 'conversion', 'awareness');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "BillingModel" AS ENUM ('cpm', 'cpc', 'cpa', 'flat_fee', 'revenue_share');

-- CreateEnum
CREATE TYPE "AttributionModel" AS ENUM ('last_click', 'first_click', 'linear');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "TouchpointType" AS ENUM ('impression', 'click', 'save', 'ticket_click');

-- CreateEnum
CREATE TYPE "ConversionType" AS ENUM ('lead', 'ticket_sale', 'subscription');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('pending', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('revenue', 'payout', 'refund', 'adjustment');

-- CreateEnum
CREATE TYPE "LedgerEntryStatus" AS ENUM ('pending', 'posted', 'voided');

-- CreateTable
CREATE TABLE "user_event_categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_name" TEXT NOT NULL,
    "category_type" "CategoryPrimary" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_event_category_events" (
    "id" UUID NOT NULL,
    "user_event_category_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_event_category_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "preferredCategories" "CategoryPrimary"[] DEFAULT ARRAY[]::"CategoryPrimary"[],
    "preferredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredPriceMin" DECIMAL(12,2),
    "preferredPriceMax" DECIMAL(12,2),
    "prefersFreeEvents" BOOLEAN NOT NULL DEFAULT false,
    "prefersOnlineEvents" BOOLEAN NOT NULL DEFAULT false,
    "excludedCategories" "CategoryPrimary"[] DEFAULT ARRAY[]::"CategoryPrimary"[],
    "excludedCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receiveEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "receivePushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "notificationFrequency" TEXT DEFAULT 'daily',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'organizer',
    "website_url" TEXT,
    "contact_email" TEXT,
    "billing_email" TEXT,
    "tax_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL DEFAULT 'traffic',
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "billing_model" "BillingModel" NOT NULL DEFAULT 'cpc',
    "budget_amount" DECIMAL(12,2),
    "budget_currency" TEXT NOT NULL DEFAULT 'CLP',
    "attribution_model" "AttributionModel" NOT NULL DEFAULT 'last_click',
    "attribution_window_days" INTEGER NOT NULL DEFAULT 7,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "target_cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_categories" "CategoryPrimary"[] DEFAULT ARRAY[]::"CategoryPrimary"[],
    "target_audience" "Audience"[] DEFAULT ARRAY[]::"Audience"[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_promotions" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'active',
    "is_sponsored" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "boost_score" DECIMAL(6,3),
    "cta_text" TEXT,
    "landing_url" TEXT,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribution_touchpoints" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_promotion_id" UUID,
    "user_id" UUID,
    "session_id" TEXT,
    "touchpoint_type" "TouchpointType" NOT NULL,
    "source" TEXT,
    "medium" TEXT,
    "referrer_url" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_touchpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversions" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_promotion_id" UUID,
    "touchpoint_id" UUID,
    "user_id" UUID,
    "conversion_type" "ConversionType" NOT NULL DEFAULT 'ticket_sale',
    "status" "ConversionStatus" NOT NULL DEFAULT 'pending',
    "external_reference" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "gross_amount" DECIMAL(12,2),
    "net_amount" DECIMAL(12,2),
    "commission_amount" DECIMAL(12,2),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "event_id" UUID,
    "conversion_id" UUID,
    "entry_type" "LedgerEntryType" NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT 'posted',
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PreferredUserEventCategories" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PreferredUserEventCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExcludedUserEventCategories" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ExcludedUserEventCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "user_event_categories_user_id_idx" ON "user_event_categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_event_categories_user_id_category_name_key" ON "user_event_categories"("user_id", "category_name");

-- CreateIndex
CREATE INDEX "user_event_category_events_user_event_category_id_idx" ON "user_event_category_events"("user_event_category_id");

-- CreateIndex
CREATE INDEX "user_event_category_events_event_id_idx" ON "user_event_category_events"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_owner_user_id_idx" ON "organizations"("owner_user_id");

-- CreateIndex
CREATE INDEX "organizations_type_is_active_idx" ON "organizations"("type", "is_active");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_idx" ON "campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "campaigns_status_start_at_end_at_idx" ON "campaigns"("status", "start_at", "end_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_organization_id_slug_key" ON "campaigns"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "event_promotions_event_id_status_idx" ON "event_promotions"("event_id", "status");

-- CreateIndex
CREATE INDEX "event_promotions_campaign_id_status_idx" ON "event_promotions"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_promotions_campaign_id_event_id_key" ON "event_promotions"("campaign_id", "event_id");

-- CreateIndex
CREATE INDEX "attribution_touchpoints_campaign_id_occurred_at_idx" ON "attribution_touchpoints"("campaign_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attribution_touchpoints_event_id_occurred_at_idx" ON "attribution_touchpoints"("event_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attribution_touchpoints_event_promotion_id_idx" ON "attribution_touchpoints"("event_promotion_id");

-- CreateIndex
CREATE INDEX "attribution_touchpoints_user_id_occurred_at_idx" ON "attribution_touchpoints"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "attribution_touchpoints_type_occurred_at_idx" ON "attribution_touchpoints"("touchpoint_type", "occurred_at");

-- CreateIndex
CREATE INDEX "conversions_campaign_id_status_occurred_at_idx" ON "conversions"("campaign_id", "status", "occurred_at");

-- CreateIndex
CREATE INDEX "conversions_event_id_occurred_at_idx" ON "conversions"("event_id", "occurred_at");

-- CreateIndex
CREATE INDEX "conversions_touchpoint_id_idx" ON "conversions"("touchpoint_id");

-- CreateIndex
CREATE INDEX "conversions_user_id_occurred_at_idx" ON "conversions"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_organization_id_occurred_at_idx" ON "ledger_entries"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_campaign_id_occurred_at_idx" ON "ledger_entries"("campaign_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_event_id_occurred_at_idx" ON "ledger_entries"("event_id", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_conversion_id_idx" ON "ledger_entries"("conversion_id");

-- CreateIndex
CREATE INDEX "ledger_entries_type_status_occurred_at_idx" ON "ledger_entries"("entry_type", "status", "occurred_at");

-- CreateIndex
CREATE INDEX "_PreferredUserEventCategories_B_index" ON "_PreferredUserEventCategories"("B");

-- CreateIndex
CREATE INDEX "_ExcludedUserEventCategories_B_index" ON "_ExcludedUserEventCategories"("B");

-- AddForeignKey
ALTER TABLE "user_event_category_events" ADD CONSTRAINT "user_event_category_events_user_event_category_id_fkey" FOREIGN KEY ("user_event_category_id") REFERENCES "user_event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_event_category_events" ADD CONSTRAINT "user_event_category_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_promotions" ADD CONSTRAINT "event_promotions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_promotions" ADD CONSTRAINT "event_promotions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_touchpoints" ADD CONSTRAINT "attribution_touchpoints_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_touchpoints" ADD CONSTRAINT "attribution_touchpoints_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_touchpoints" ADD CONSTRAINT "attribution_touchpoints_event_promotion_id_fkey" FOREIGN KEY ("event_promotion_id") REFERENCES "event_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_touchpoints" ADD CONSTRAINT "attribution_touchpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_event_promotion_id_fkey" FOREIGN KEY ("event_promotion_id") REFERENCES "event_promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_touchpoint_id_fkey" FOREIGN KEY ("touchpoint_id") REFERENCES "attribution_touchpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "conversions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreferredUserEventCategories" ADD CONSTRAINT "_PreferredUserEventCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "user_event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreferredUserEventCategories" ADD CONSTRAINT "_PreferredUserEventCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedUserEventCategories" ADD CONSTRAINT "_ExcludedUserEventCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "user_event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedUserEventCategories" ADD CONSTRAINT "_ExcludedUserEventCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
