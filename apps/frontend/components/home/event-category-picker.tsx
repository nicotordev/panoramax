"use client"

import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { CategoryPrimaryEnum } from "@/types/api"
import { useTranslations } from "next-intl"
import Image from "next/image"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { HiArrowUpRight, HiSparkles } from "react-icons/hi2"
import {
  MdDirectionsRun,
  MdFamilyRestroom,
  MdFastfood,
  MdFestival,
  MdMic,
  MdMusicNote,
  MdPhotoLibrary,
  MdSportsSoccer,
  MdStar,
  MdStoreMallDirectory,
  MdTheaterComedy,
  MdWorkOutline,
} from "react-icons/md"

interface EventCategoryPickerProps {
  allEvents: Event[]
}

const CATEGORY_ICONS: Record<CategoryPrimaryEnum, ReactNode> = {
  [CategoryPrimaryEnum.music]: <MdMusicNote />,
  [CategoryPrimaryEnum.theatre]: <MdTheaterComedy />,
  [CategoryPrimaryEnum.standup]: <MdMic />,
  [CategoryPrimaryEnum.dance]: <MdDirectionsRun />,
  [CategoryPrimaryEnum.festival]: <MdFestival />,
  [CategoryPrimaryEnum.fair]: <MdStoreMallDirectory />,
  [CategoryPrimaryEnum.exhibition]: <MdPhotoLibrary />,
  [CategoryPrimaryEnum.food_drink]: <MdFastfood />,
  [CategoryPrimaryEnum.family]: <MdFamilyRestroom />,
  [CategoryPrimaryEnum.sports]: <MdSportsSoccer />,
  [CategoryPrimaryEnum.workshop]: <MdWorkOutline />,
  [CategoryPrimaryEnum.special_experience]: <MdStar />,
}

const CATEGORY_LABELS: Record<CategoryPrimaryEnum, string> = {
  [CategoryPrimaryEnum.music]: "Music",
  [CategoryPrimaryEnum.theatre]: "Theatre",
  [CategoryPrimaryEnum.standup]: "Stand-up",
  [CategoryPrimaryEnum.dance]: "Dance",
  [CategoryPrimaryEnum.festival]: "Festival",
  [CategoryPrimaryEnum.fair]: "Fair",
  [CategoryPrimaryEnum.exhibition]: "Exhibition",
  [CategoryPrimaryEnum.food_drink]: "Food & Drink",
  [CategoryPrimaryEnum.family]: "Family",
  [CategoryPrimaryEnum.sports]: "Sports",
  [CategoryPrimaryEnum.workshop]: "Workshop",
  [CategoryPrimaryEnum.special_experience]: "Special Experience",
}

function getEventTitle(event: Event) {
  return event.translation?.title || event.title
}

export default function EventCategoryPicker({
  allEvents,
}: EventCategoryPickerProps) {
  const t = useTranslations("HomePage")

  const categories = useMemo(() => {
    const counts = new Map<CategoryPrimaryEnum, number>()
    for (const event of allEvents) {
      const category = event.categoryPrimary as CategoryPrimaryEnum
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }

    return Object.values(CategoryPrimaryEnum).map((category) => ({
      key: category,
      label: CATEGORY_LABELS[category],
      count: counts.get(category) ?? 0,
    }))
  }, [allEvents])

  const previewEvents = useMemo(() => allEvents.slice(0, 3), [allEvents])

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <HiSparkles className="size-4" aria-hidden />
            {t("exploreCategories")}
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("categoriesHeading")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t("categoriesIntro")}
          </p>
        </div>

        <Link
          href="/events"
          className={cn(
            buttonVariants({ size: "lg" }),
            "shrink-0 rounded-full px-6"
          )}
        >
          {t("viewCompleteAgenda")}
          <HiArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category.key}
            href={`/events?category=${category.key}`}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            <span className="text-base text-primary" aria-hidden>
              {CATEGORY_ICONS[category.key]}
            </span>
            <span>{category.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
              {category.count}
            </span>
          </Link>
        ))}
      </div>

      {previewEvents.length > 0 ? (
        <div className="mt-12 border-t border-border/60 pt-12">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("liveEvents")}
              </p>
              <h3 className="mt-1 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {t("previewPicksTitle")}
              </h3>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/90"
            >
              {t("viewAll")}
              <HiArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewEvents.map((event) => {
              const title = getEventTitle(event)
              const href = `/events/${event.slug || event.id}`

              return (
                <Card
                  key={event.id}
                  className="group overflow-hidden border-border/60 bg-card py-0 transition-shadow hover:shadow-md"
                >
                  <Link href={href} className="block">
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
                      <Image
                        src={getEventCardImageSrc(event.imageUrl)}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-2 leading-snug font-medium text-foreground">
                        {title}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {t("viewDetails")}
                        <HiArrowUpRight className="size-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </Card>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
