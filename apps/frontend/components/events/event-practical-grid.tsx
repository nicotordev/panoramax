import { Card } from "@/components/ui/card"
import {
  audienceTranslationKey,
  formatEventEndLine,
  formatPriceRange,
} from "@/lib/event-display"
import type { Event } from "@/types/api"
import { getTranslations } from "next-intl/server"
import { HiGlobeAlt, HiTag } from "react-icons/hi2"

type RowProps = { label: string; children: React.ReactNode }

function Row({ label, children }: RowProps) {
  return (
    <div className="grid gap-1 border-b border-border/50 py-3 last:border-b-0 sm:grid-cols-[minmax(0,10rem)_1fr] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-foreground">{children}</dd>
    </div>
  )
}

type EventPracticalGridProps = {
  event: Event
  locale: string
}

export default async function EventPracticalGrid({
  event,
  locale,
}: EventPracticalGridProps) {
  const t = await getTranslations("EventPage")

  const endLine = formatEventEndLine(event, locale)
  const priceLine = formatPriceRange(event)
  const availability =
    event.translation?.availabilityText?.trim() ||
    event.availabilityText?.trim()
  const locNotes =
    event.translation?.locationNotes?.trim() || event.locationNotes?.trim()
  const address = [event.address, event.venueRaw].filter(Boolean).join(" · ")
  const audienceKey = audienceTranslationKey(event.audience)
  const secondary = event.categorySecondary
    ? event.categorySecondary.replace(/_/g, " ")
    : null
  const tags = event.tags?.filter(Boolean) ?? []
  const labels = event.editorialLabels?.filter(Boolean) ?? []

  const hasAny =
    event.isFree ||
    priceLine ||
    availability ||
    audienceKey ||
    secondary ||
    tags.length > 0 ||
    labels.length > 0 ||
    address ||
    locNotes ||
    endLine ||
    event.isOnline ||
    event.language

  if (!hasAny) {
    return null
  }

  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {t("practicalTitle")}
      </h2>
      <Card className="border-border/60 bg-card/80 px-4 py-2 shadow-none ring-1 ring-border/60">
        <dl>
          {event.isOnline ? (
            <Row label={t("attendance")}>
              <span className="inline-flex items-center gap-1.5">
                <HiGlobeAlt className="size-4 text-primary" aria-hidden />
                {t("onlineEvent")}
              </span>
            </Row>
          ) : null}
          {event.isFree ? (
            <Row label={t("price")}>{t("freeEvent")}</Row>
          ) : priceLine ? (
            <Row label={t("price")}>{priceLine}</Row>
          ) : null}
          {availability ? (
            <Row label={t("availability")}>{availability}</Row>
          ) : null}
          {audienceKey ? (
            <Row label={t("audienceLabel")}>{t(audienceKey)}</Row>
          ) : null}
          {secondary ? (
            <Row label={t("secondaryCategory")}>
              <span className="capitalize">{secondary}</span>
            </Row>
          ) : null}
          {tags.length > 0 ? (
            <Row label={t("tags")}>
              <span className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    <HiTag className="size-3.5 opacity-70" aria-hidden />
                    {tag}
                  </span>
                ))}
              </span>
            </Row>
          ) : null}
          {labels.length > 0 ? (
            <Row label={t("editorialLabels")}>
              <ul className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <li
                    key={label}
                    className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          {address ? <Row label={t("address")}>{address}</Row> : null}
          {locNotes ? <Row label={t("locationNotes")}>{locNotes}</Row> : null}
          {endLine ? <Row label={t("ends")}>{endLine}</Row> : null}
          {event.language ? (
            <Row label={t("language")}>
              <span className="uppercase">{event.language}</span>
            </Row>
          ) : null}
        </dl>
      </Card>
    </section>
  )
}
