-- CreateTable
CREATE TABLE "event_tiers" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "fee" DECIMAL(12,2),
    "total_price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "raw_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_tiers_event_id_idx" ON "event_tiers"("event_id");

-- CreateIndex
CREATE INDEX "event_tiers_event_id_sort_order_idx" ON "event_tiers"("event_id", "sort_order");

-- AddForeignKey
ALTER TABLE "event_tiers" ADD CONSTRAINT "event_tiers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
