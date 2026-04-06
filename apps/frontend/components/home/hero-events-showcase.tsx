"use client"

import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"
import type { Event, EventsListMeta } from "@/types/api"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  HiArrowLongRight,
  HiChevronLeft,
  HiChevronRight,
  HiLightBulb,
} from "react-icons/hi2"
import { getEventCardImageSrc } from "./event-card-utils"

interface HeroEventsShowcaseProps {
  events: Event[]
  eventsMeta: EventsListMeta
}

function formatStatInt(n: number, locale: string): string {
  return Math.max(0, Math.floor(n)).toLocaleString(locale)
}

const wrapIndex = (i: number, len: number) => ((i % len) + len) % len

function formatCategoryLabel(cat: Event["categoryPrimary"]): string {
  return cat.replace(/_/g, " ")
}

function formatEventWhen(event: Event, locale: string): string {
  const text = event.dateText?.trim()
  if (text) return text
  return new Date(event.startAt).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: event.allDay ? undefined : "short",
  })
}

function formatEventLocation(event: Event): string {
  const parts = [event.venueName, event.commune || event.city].filter(Boolean)
  return parts.join(", ")
}

function DotIndicators({
  count,
  active,
  onSelect,
  getAriaLabel,
}: {
  count: number
  active: number
  onSelect: (i: number) => void
  getAriaLabel: (index: number) => string
}) {
  return (
    <div className="flex max-w-[200px] flex-wrap items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={getAriaLabel(i + 1)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active === i
              ? "w-7 bg-primary"
              : "w-2 bg-border hover:bg-muted-foreground"
          )}
        />
      ))}
    </div>
  )
}

function StackCard({
  event,
  locale,
  position,
  zIndex,
}: {
  event: Event
  locale: string
  position: "left" | "center" | "right"
  zIndex: number
}) {
  const imageSrc = getEventCardImageSrc(event.imageUrl)
  const positionStyles: Record<string, string> = {
    left: "-translate-x-[35%] scale-[0.78] rotate-[-8deg] opacity-40 brightness-75 blur-[1px]",
    center:
      "translate-x-0 scale-100 rotate-0 opacity-100 brightness-100 blur-0",
    right:
      "translate-x-[35%] scale-[0.78] rotate-[8deg] opacity-40 brightness-75 blur-[1px]",
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        positionStyles[position]
      )}
      style={{ zIndex }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border",
          position === "center"
            ? "animate-float aspect-3/4 w-[min(88vw,290px)] border-border/60 shadow-2xl ring-1 ring-ring/30"
            : "aspect-3/4 w-[min(75vw,230px)] border-border/30 shadow-lg"
        )}
      >
        <Image
          src={imageSrc}
          alt={event.title}
          fill
          className="pointer-events-none object-cover"
          priority={position === "center"}
          sizes="(max-width: 768px) 88vw, 290px"
        />

        {position === "center" && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-card via-card/55 to-transparent p-5 pt-10">
            <span className="mb-2 inline-block rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-primary uppercase">
              {formatCategoryLabel(event.categoryPrimary)}
            </span>
            <p className="line-clamp-2 text-sm leading-snug font-bold text-card-foreground">
              {event.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatEventWhen(event, locale)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Contenido principal del hero (copy + carrusel). La envoltura con vídeo, gradiente y nav vive en `hero-section.tsx`.
 */
export default function HeroEventsShowcase({
  events,
  eventsMeta,
}: HeroEventsShowcaseProps) {
  const locale = useLocale()
  const t = useTranslations("HomePage")

  const highlightStats = useMemo(() => {
    return [
      {
        value: formatStatInt(eventsMeta.total, locale),
        label: t("stats.events"),
      },
      {
        value: formatStatInt(eventsMeta.stats.communes, locale),
        label: t("stats.communes"),
      },
      {
        value: formatStatInt(eventsMeta.stats.free, locale),
        label: t("stats.free"),
      },
    ]
  }, [eventsMeta, locale, t])

  const n = events.length
  const [activeIndex, setActiveIndex] = useState(0)
  const slideIndex = n === 0 ? 0 : wrapIndex(activeIndex, n)

  const paginate = useCallback(
    (direction: number) => {
      if (n === 0) return
      setActiveIndex((prev) => wrapIndex(prev + direction, n))
    },
    [n]
  )

  useEffect(() => {
    if (n === 0) return
    const id = setInterval(() => paginate(1), 4000)
    return () => clearInterval(id)
  }, [paginate, n])

  const selectedEvent = n > 0 ? events[slideIndex] : null
  const prevEvent = n > 0 ? events[wrapIndex(slideIndex - 1, n)] : null
  const nextEvent = n > 0 ? events[wrapIndex(slideIndex + 1, n)] : null

  const [dragStart, setDragStart] = useState<number | null>(null)

  const handleDragStart = (e: React.PointerEvent) => {
    setDragStart(e.clientX)
  }

  const handleDragEnd = (e: React.PointerEvent) => {
    if (dragStart === null || n === 0) return
    const delta = e.clientX - dragStart
    if (delta > 60) paginate(-1)
    if (delta < -60) paginate(1)
    setDragStart(null)
  }

  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 h-[min(500px,70vh)] w-[min(400px,55vw)] max-w-none -translate-y-1/2 rounded-full bg-primary/15 blur-[100px] lg:right-[5%]"
      />

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-12 lg:min-h-[calc(100vh-11rem)] lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col [text-shadow:0_1px_2px_oklch(0_0_0/0.25)]">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
              <HiLightBulb className="size-3 text-primary" aria-hidden />
              {t("liveEvents")}
            </span>
            <Link
              href="/events"
              className="group flex items-center gap-1 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground"
            >
              {t("viewAll")}
              <HiArrowLongRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <h1 className="font-serif text-5xl leading-[1.08] font-bold tracking-tight text-balance text-foreground sm:text-6xl xl:text-7xl">
            {t("titleStart")} <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/85">
            {t("description")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {selectedEvent ? (
              <a
                href={`/events/${selectedEvent.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/35 hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("viewDetails")}
                <HiArrowLongRight className="size-4" aria-hidden />
              </a>
            ) : (
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/35 hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("viewEvents")}
                <HiArrowLongRight className="size-4" aria-hidden />
              </Link>
            )}
            <button
              type="button"
              className="group flex items-center gap-2 rounded-full border border-border/80 bg-background/40 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-md transition-all hover:border-primary/50 hover:bg-background/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t("exploreCategories")}
              <HiArrowLongRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </div>

          <div className="mt-14 flex flex-wrap gap-8">
            {highlightStats.map(({ value, label }) => (
              <div key={label}>
                <p className="font-serif text-2xl font-bold text-foreground">
                  {value}
                </p>
                <p className="mt-0.5 text-xs text-foreground/75">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          {n > 0 && selectedEvent && prevEvent && nextEvent ? (
            <>
              <div
                className="relative h-[420px] w-full max-w-sm select-none"
                onPointerDown={handleDragStart}
                onPointerUp={handleDragEnd}
                role="region"
                aria-label={t("carouselAria")}
              >
                <StackCard
                  key={`prev-${prevEvent.id}`}
                  event={prevEvent}
                  locale={locale}
                  position="left"
                  zIndex={1}
                />
                <StackCard
                  key={`next-${nextEvent.id}`}
                  event={nextEvent}
                  locale={locale}
                  position="right"
                  zIndex={1}
                />
                <StackCard
                  key={`center-${selectedEvent.id}`}
                  event={selectedEvent}
                  locale={locale}
                  position="center"
                  zIndex={10}
                />
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => paginate(-1)}
                  aria-label={t("previousEvent")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/30 text-foreground backdrop-blur-md transition-all hover:border-primary/50 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HiChevronLeft className="size-4" />
                </button>

                <DotIndicators
                  count={n}
                  active={slideIndex}
                  onSelect={setActiveIndex}
                  getAriaLabel={(index) => t("goToEvent", { index })}
                />

                <button
                  type="button"
                  onClick={() => paginate(1)}
                  aria-label={t("nextEvent")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/30 text-foreground backdrop-blur-md transition-all hover:border-primary/50 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HiChevronRight className="size-4" />
                </button>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/90 px-5 py-3 text-center text-card-foreground shadow-lg backdrop-blur-md">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  {formatCategoryLabel(selectedEvent.categoryPrimary)}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold">
                  {selectedEvent.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventWhen(selectedEvent, locale)} ·{" "}
                  {formatEventLocation(selectedEvent)}
                </p>
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/35 px-6 py-12 text-center shadow-lg backdrop-blur-md">
              <p className="text-sm font-medium text-foreground">
                {t("emptyTitle")}
              </p>
              <p className="mt-2 text-xs text-foreground/80">
                {t("emptyDescription")}
              </p>
              <Link
                href="/events"
                className="mt-6 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t("goToEvents")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
