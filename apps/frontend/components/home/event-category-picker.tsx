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
import "swiper/css"
import "swiper/css/free-mode"
import { FreeMode, Mousewheel } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"

interface EventCategoryPickerProps {
  allEvents: Event[]
}

const ALGOLIA_EVENTS_INDEX_NAME =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? ""

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

const CATEGORY_IMAGE_SRC: Record<CategoryPrimaryEnum, string> = {
  [CategoryPrimaryEnum.music]: "/assets/img/categories/music.webp",
  [CategoryPrimaryEnum.theatre]: "/assets/img/categories/theatre.webp",
  [CategoryPrimaryEnum.standup]: "/assets/img/categories/standup.webp",
  [CategoryPrimaryEnum.dance]: "/assets/img/categories/dance.webp",
  [CategoryPrimaryEnum.festival]: "/assets/img/categories/festival.webp",
  [CategoryPrimaryEnum.fair]: "/assets/img/categories/fair.webp",
  [CategoryPrimaryEnum.exhibition]: "/assets/img/categories/exhibition.webp",
  [CategoryPrimaryEnum.food_drink]: "/assets/img/categories/food_drink.webp",
  [CategoryPrimaryEnum.family]: "/assets/img/categories/family.webp",
  [CategoryPrimaryEnum.sports]: "/assets/img/categories/sports.webp",
  [CategoryPrimaryEnum.workshop]: "/assets/img/categories/workshop.webp",
  [CategoryPrimaryEnum.special_experience]:
    "/assets/img/categories/special_experience.webp",
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

function getCategoryFilterHref(category: CategoryPrimaryEnum) {
  if (!ALGOLIA_EVENTS_INDEX_NAME) {
    return `/events?category=${category}`
  }

  const params = new URLSearchParams()
  params.set(
    `${ALGOLIA_EVENTS_INDEX_NAME}[refinementList][categoryPrimary][0]`,
    category
  )

  return `/events?${params.toString()}`
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

  const previewEvents = useMemo(() => allEvents.slice(0, 8), [allEvents])

  return (
    <section className="mx-auto mt-8 w-full max-w-7xl px-6 py-4 lg:px-8">
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

      <Swiper
        modules={[FreeMode, Mousewheel]}
        slidesPerView="auto"
        spaceBetween={12}
        freeMode={{ enabled: true, momentum: true }}
        mousewheel={{ forceToAxis: true }}
        watchOverflow
        className="w-full py-1"
        wrapperClass="!items-stretch"
      >
        {categories.map((category) => (
          <SwiperSlide key={category.key} className="h-auto! w-28! sm:w-32!">
            <Link
              href={getCategoryFilterHref(category.key)}
              className={cn(
                "group relative flex h-full min-h-28 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border border-border/70 p-3 text-center text-foreground shadow-sm transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:min-h-32",
                "active:border-primary/70"
              )}
              aria-label={`${category.label} (${category.count})`}
            >
              <Image
                src={CATEGORY_IMAGE_SRC[category.key]}
                alt={category.label}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="128px"
              />
              <div
                className="absolute inset-0 bg-linear-to-t from-background/95 via-background/55 to-background/25"
                aria-hidden
              />
              <span
                className="relative z-10 text-2xl text-primary drop-shadow-sm transition-transform group-hover:scale-110"
                aria-hidden
              >
                {CATEGORY_ICONS[category.key]}
              </span>
              <span className="relative z-10 line-clamp-2 text-xs leading-tight font-medium drop-shadow-sm sm:text-sm">
                {category.label}
              </span>
              <span className="relative z-10 mt-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums backdrop-blur-sm">
                {category.count}
              </span>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {previewEvents.length > 0 ? (
        <div className="pt-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("events")}
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

          <Swiper
            modules={[FreeMode, Mousewheel]}
            slidesPerView="auto"
            spaceBetween={16}
            freeMode={{ enabled: true, momentum: true }}
            mousewheel={{ forceToAxis: true }}
            watchOverflow
            className="w-full py-1"
            wrapperClass="!items-stretch"
          >
            {previewEvents.map((event) => {
              const title = getEventTitle(event)
              const href = `/events/${event.slug || event.id}`

              return (
                <SwiperSlide
                  key={event.id}
                  className="h-auto! w-[min(100%,18rem)]! sm:w-80!"
                >
                  <Card className="group h-full overflow-hidden border-border/60 bg-card py-0 transition-shadow hover:shadow-md">
                    <Link href={href} className="block h-full">
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
                </SwiperSlide>
              )
            })}
          </Swiper>
        </div>
      ) : null}
    </section>
  )
}
