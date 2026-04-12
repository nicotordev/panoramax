import {
  Card,
  CardDescription,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import type { Event, EventTier } from "@/types/api"
import { getTranslations } from "next-intl/server"

function tierPriceSummary(tier: EventTier): string | null {
  const total = tier.totalPrice?.trim()
  if (total) return total
  const price = tier.price?.trim()
  return price || null
}

function tierDetailText(tier: EventTier): string | null {
  return tier.translation?.rawText?.trim() || tier.rawText?.trim() || null
}

type EventTiersSectionProps = {
  event: Event
}

export default async function EventTiersSection({
  event,
}: EventTiersSectionProps) {
  const tiers = event.tiers ?? []
  const priceTextFallback =
    event.translation?.priceText?.trim() || event.priceText?.trim() || null

  if (tiers.length === 0 && !priceTextFallback) {
    return null
  }

  const t = await getTranslations("EventPage")

  if (tiers.length === 0 && priceTextFallback) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {t("tierPrices")}
        </h2>
        <Card className="border-border/60 bg-card/90 p-4 shadow-xs ring-1 ring-border/50">
          <p className="text-sm leading-6 whitespace-pre-wrap text-foreground/90">
            {priceTextFallback}
          </p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {t("tierPrices")}
      </h2>
      <ul className="flex flex-col gap-3">
        {tiers.map((tier) => {
          const summary = tierPriceSummary(tier)
          const detail = tierDetailText(tier)
          const fee = tier.fee?.trim()

          return (
            <li key={tier.id}>
              <Card
                className="border-border/60 bg-card/90 shadow-xs ring-1 ring-border/50"
                size="default"
              >
                <CardContent className="gap-3 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle>
                        {tier.translation?.name?.trim() || tier.name}
                      </CardTitle>
                      {detail ? (
                        <CardDescription>{detail}</CardDescription>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      {summary ? (
                        <p className="text-base font-semibold text-primary tabular-nums">
                          {summary}{" "}
                          <span className="text-sm font-medium text-muted-foreground">
                            {tier.currency}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">
                          {tier.currency}
                        </p>
                      )}
                      {fee ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("tierFee")}: {fee} {tier.currency}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
