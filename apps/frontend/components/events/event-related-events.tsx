import { Card } from "@/components/ui/card"
import { getRelatedEventsForEvent } from "@/lib/event-related"
import { eventCardTitle } from "@/lib/event-display"
import { formatEventLocation, formatEventWhen } from "@/lib/home-showcase.utils"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { Link } from "@/i18n/navigation"
import type { Event } from "@/types/api"
import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { HiArrowUpRight } from "react-icons/hi2"

type EventRelatedEventsProps = {
  event: Event
  locale: string
}

export default async function EventRelatedEvents({
  event,
  locale,
}: EventRelatedEventsProps) {
  const t = await getTranslations("EventPage")
  const related = await getRelatedEventsForEvent(event, locale)

  if (related.length === 0) {
    return null
  }

  return (
    <section className="mt-14 border-t border-border/80 pt-10">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {t("relatedTitle")}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {related.map((ev) => {
          const href = `/events/${ev.slug || ev.id}`
          const title = eventCardTitle(ev)
          return (
            <li key={ev.id}>
              <Card
                size="sm"
                className="h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
              >
                <Link
                  href={href}
                  className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="relative aspect-[16/9] w-full shrink-0 bg-muted">
                    <Image
                      src={getEventCardImageSrc(ev.imageUrl)}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 360px"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatEventWhen(ev, locale)}
                    </span>
                    <span className="font-heading text-base font-semibold leading-snug text-foreground group-hover:text-primary">
                      {title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatEventLocation(ev)}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {t("relatedSee")}
                      <HiArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
