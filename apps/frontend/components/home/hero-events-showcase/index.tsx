"use client"

import { AnimatePresence } from "framer-motion"
import { Link } from "@/i18n/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  HiArrowLongRight,
  HiChevronLeft,
  HiChevronRight,
  HiLightBulb,
} from "react-icons/hi2"
import {
  AUTOPLAY_INTERVAL_MS,
  INTERACTION_COOLDOWN_MS,
} from "@/constants/home.constants"
import { DotIndicators } from "./dot-indicators"
import { EventStackCard } from "./event-stack-card"
import type {
  HeroEventsShowcaseProps,
  EventStackCardItem,
} from "@/types/home-showcase"
import {
  formatCategoryLabel,
  formatEventLocation,
  formatEventWhen,
  formatStatInt,
  wrapIndex,
} from "@/lib/home-showcase.utils"

/**
 * Contenido principal del hero (copy + carrusel).
 * La envoltura con video, gradiente y nav vive en `hero-section.tsx`.
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
  const [direction, setDirection] = useState(1)
  const [autoplayPausedUntil, setAutoplayPausedUntil] = useState(0)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const slideIndex = n === 0 ? 0 : wrapIndex(activeIndex, n)

  const pauseAutoplay = useCallback(() => {
    setAutoplayPausedUntil(Date.now() + INTERACTION_COOLDOWN_MS)
  }, [])

  const paginate = useCallback(
    (nextDirection: number) => {
      if (n === 0) return
      setDirection(nextDirection >= 0 ? 1 : -1)
      setActiveIndex((prev) => wrapIndex(prev + nextDirection, n))
    },
    [n]
  )

  useEffect(() => {
    if (n === 0) return

    const id = setInterval(() => {
      if (Date.now() < autoplayPausedUntil) return
      paginate(1)
    }, AUTOPLAY_INTERVAL_MS)

    return () => clearInterval(id)
  }, [autoplayPausedUntil, paginate, n])

  const selectedEvent = n > 0 ? events[slideIndex] : null
  const prevEvent = n > 0 ? events[wrapIndex(slideIndex - 1, n)] : null
  const nextEvent = n > 0 ? events[wrapIndex(slideIndex + 1, n)] : null

  const handleDragStart = (e: React.PointerEvent) => {
    setDragStart(e.clientX)
  }

  const handleDragEnd = (e: React.PointerEvent) => {
    if (dragStart === null || n === 0) return
    const delta = e.clientX - dragStart

    if (Math.abs(delta) > 60) pauseAutoplay()
    if (delta > 60) paginate(-1)
    if (delta < -60) paginate(1)

    setDragStart(null)
  }

  const stackCards: EventStackCardItem[] =
    n > 0 && selectedEvent && prevEvent && nextEvent
      ? [
          { event: prevEvent, position: "left", zIndex: 1 },
          { event: nextEvent, position: "right", zIndex: 1 },
          { event: selectedEvent, position: "center", zIndex: 10 },
        ]
      : []

  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 h-[min(500px,70vh)] w-[min(400px,55vw)] max-w-none -translate-y-1/2 rounded-full bg-primary/15 blur-[100px] lg:right-[5%]"
      />

      <div className="relative z-10 grid w-full grid-cols-1 items-center gap-12 pb-24 lg:grid-cols-2 lg:gap-16">
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
            {t("titleStart")}{" "}
            <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/85">
            {t("description")}
          </p>

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

        <div className="relative flex flex-col items-center gap-6">
          {n > 0 && selectedEvent && prevEvent && nextEvent ? (
            <>
              <div
                className="relative h-[420px] w-full max-w-sm select-none"
                onPointerDown={handleDragStart}
                onPointerUp={handleDragEnd}
                role="region"
                aria-label={t("carouselAria")}
              >
                <AnimatePresence
                  initial={false}
                  custom={direction}
                  mode="popLayout"
                >
                  {stackCards.map(({ event, position, zIndex }) => (
                    <EventStackCard
                      key={event.id}
                      event={event}
                      locale={locale}
                      position={position}
                      zIndex={zIndex}
                      direction={direction}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    pauseAutoplay()
                    paginate(-1)
                  }}
                  aria-label={t("previousEvent")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/30 text-foreground backdrop-blur-md transition-all hover:border-primary/50 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HiChevronLeft className="size-4" />
                </button>

                <DotIndicators
                  count={n}
                  active={slideIndex}
                  onSelect={(index) => {
                    if (index === slideIndex) return
                    pauseAutoplay()
                    setDirection(index > slideIndex ? 1 : -1)
                    setActiveIndex(index)
                  }}
                  getAriaLabel={(index) => t("goToEvent", { index })}
                />

                <button
                  type="button"
                  onClick={() => {
                    pauseAutoplay()
                    paginate(1)
                  }}
                  aria-label={t("nextEvent")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/30 text-foreground backdrop-blur-md transition-all hover:border-primary/50 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <HiChevronRight className="size-4" />
                </button>
              </div>

              <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 rounded-xl border border-border/60 bg-card/90 px-5 py-3 text-center text-card-foreground shadow-lg backdrop-blur-md">
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
