import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { useTranslations } from "next-intl"
import Image from "next/image"
import {
  HiArrowUpRight,
  HiCalendarDays,
  HiMapPin,
  HiSparkles,
} from "react-icons/hi2"
import { Button } from "../ui/button"

interface EventsBentoGridProps {
  events: Event[]
}

function formatEventDate(event: Event) {
  const translatedDateText = event.translation?.dateText?.trim()
  if (translatedDateText) {
    return translatedDateText
  }

  if (event.dateText?.trim()) {
    return event.dateText
  }

  return new Date(event.startAt).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: event.allDay ? undefined : "short",
  })
}

function formatLocation(event: Event) {
  return [
    event.translation?.venueName || event.venueName,
    event.commune || event.city,
  ]
    .filter(Boolean)
    .join(", ")
}

function formatCategory(category: Event["categoryPrimary"]) {
  return category.replace(/_/g, " ")
}

export default function EventsBentoGrid({ events }: EventsBentoGridProps) {
  const t = useTranslations("HomePage")
  const featuredEvents = events.slice(0, 5)

  if (featuredEvents.length === 0) {
    return null
  }

  const [heroEvent, secondaryEvent, tertiaryEvent, quaternaryEvent] =
    featuredEvents

  const getEventTitle = (event: Event) =>
    event.translation?.title || event.title
  const getEventSummary = (event: Event) =>
    event.translation?.summary || event.summary
  const getEventPriceText = (event: Event) =>
    event.translation?.priceText || event.priceText

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-4 lg:px-8 mb-8">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <HiSparkles className="size-4" />
            {t("selectedForTheWeek")}
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("quickMapOfWhatToSeeThisWeek")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t("bentoGridIntro")}
          </p>
        </div>

        <Link
          href="/events"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
        >
          {t("viewCompleteAgenda")}
          <HiArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-2">
        {heroEvent && (
          <Card className="group relative col-span-1 overflow-hidden border-border/60 bg-card py-0 lg:col-span-6 lg:row-span-2">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-background/10" />
            <div className="relative h-full min-h-112">
              <Image
                src={getEventCardImageSrc(heroEvent.imageUrl)}
                alt={getEventTitle(heroEvent)}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div
                className="pointer-events-none absolute inset-0 bg-black/35"
                aria-hidden="true"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-40 p-6 sm:p-8">
                <Badge className="mb-4 rounded-full bg-primary/90 text-primary-foreground hover:bg-primary/90">
                  {formatCategory(heroEvent.categoryPrimary)}
                </Badge>
                <h3 className="max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {getEventTitle(heroEvent)}
                </h3>
                {getEventSummary(heroEvent) && (
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                    {getEventSummary(heroEvent)}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/85">
                  <span className="inline-flex items-center gap-2">
                    <HiCalendarDays className="size-4" />
                    {formatEventDate(heroEvent)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <HiMapPin className="size-4" />
                    {formatLocation(heroEvent)}
                  </span>
                </div>
                <Link
                  href={`/events/${heroEvent.slug || heroEvent.id}`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-6 inline-flex rounded-full"
                  )}
                >
                  {t("viewDetails")}
                  <HiArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}

        {[secondaryEvent, tertiaryEvent, quaternaryEvent]
          .filter((event): event is Event => Boolean(event))
          .map((event, index) => (
            <Card
              key={event.id}
              className={[
                "group relative col-span-1 w-full overflow-hidden border-border/60 bg-card py-0",
                index === 0 ? "lg:col-span-3" : "",
                index === 1 ? "lg:col-span-3" : "",
                index === 2 ? "lg:col-span-6" : "",
                index === 3 ? "lg:col-span-2" : "",
              ].join(" ")}
            >
              <div className="relative h-full min-h-72">
                <Image
                  src={getEventCardImageSrc(event.imageUrl)}
                  alt={getEventTitle(event)}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width: 1024px) 100vw, 25vw"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-black/35"
                  aria-hidden="true"
                />
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 z-40 p-5">
                  <Badge
                    variant="secondary"
                    className="mb-3 rounded-full bg-background/90 text-foreground"
                  >
                    {event.isFree
                      ? t("free")
                      : getEventPriceText(event) || t("event")}
                  </Badge>
                  <h3 className="line-clamp-2 text-xl font-semibold text-white">
                    {getEventTitle(event)}
                  </h3>
                  <div className="mt-3 space-y-1 text-xs text-white/75">
                    <p className="inline-flex items-center gap-2">
                      <HiCalendarDays className="size-3.5" />
                      {formatEventDate(event)}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <HiMapPin className="size-3.5" />
                      {formatLocation(event)}
                    </p>
                  </div>
                  <Link href={`/events/${event.slug || event.id}`}>
                    <Button className="mt-4 inline-flex items-center gap-2 text-sm cursor-pointer">
                      {t("viewDetails")}
                      <HiArrowUpRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </section>
  )
}
