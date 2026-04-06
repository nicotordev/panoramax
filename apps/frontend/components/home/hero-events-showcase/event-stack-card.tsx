"use client"

import { EVENT_PLACEHOLDER_IMAGE } from "@/constants/common.constants"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { formatCategoryLabel, formatEventWhen } from "@/lib/home-showcase.utils"
import { cn } from "@/lib/utils"
import type { EventStackCardProps } from "@/types/home-showcase"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const positionStyles: Record<EventStackCardProps["position"], string> = {
  left: "w-[min(75vw,230px)] border-border/30 shadow-lg",
  center:
    "animate-float w-[min(88vw,290px)] border-border/60 shadow-2xl ring-1 ring-ring/30",
  right: "w-[min(75vw,230px)] border-border/30 shadow-lg",
}

export function EventStackCard({
  event,
  locale,
  position,
  zIndex,
  direction,
}: EventStackCardProps) {
  const [imageSrc, setImageSrc] = useState(getEventCardImageSrc(event.imageUrl))
  const displayTitle = event.translation?.title || event.title

  const variants = {
    left: {
      x: "-35%",
      scale: 0.78,
      rotate: -8,
      opacity: 0.4,
      filter: "brightness(0.75) blur(1px)",
    },
    center: {
      x: "0%",
      scale: 1,
      rotate: 0,
      opacity: 1,
      filter: "brightness(1) blur(0px)",
    },
    right: {
      x: "35%",
      scale: 0.78,
      rotate: 8,
      opacity: 0.4,
      filter: "brightness(0.75) blur(1px)",
    },
    enter: (dir: number) => ({
      x: dir > 0 ? "52%" : "-52%",
      scale: 0.68,
      rotate: dir > 0 ? 12 : -12,
      opacity: 0,
      filter: "brightness(0.6) blur(4px)",
    }),
    exit: (dir: number) => ({
      x: dir > 0 ? "-52%" : "52%",
      scale: 0.68,
      rotate: dir > 0 ? -12 : 12,
      opacity: 0,
      filter: "brightness(0.6) blur(4px)",
    }),
  }

  return (
    <motion.div
      custom={direction}
      initial="enter"
      animate={position}
      exit="exit"
      variants={variants}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute inset-0 will-change-transform"
      style={{ zIndex }}
    >
      <Link
        href={`/events/${event.slug || event.id}`}
        className="flex items-center justify-center"
      >
        <div
          className={cn(
            "relative aspect-3/4 overflow-hidden rounded-2xl border",
            positionStyles[position]
          )}
        >
          <Image
            src={imageSrc}
            alt={displayTitle}
            fill
            className="pointer-events-none object-cover"
            priority={position === "center"}
            sizes="(max-width: 768px) 88vw, 290px"
            onError={() => {
              setImageSrc(EVENT_PLACEHOLDER_IMAGE.src)
            }}
          />

          {position === "center" && (
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-card via-card/55 to-transparent p-5 pt-10">
              <span className="mb-2 inline-block rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-widest text-primary uppercase">
                {formatCategoryLabel(event.categoryPrimary)}
              </span>
              <p className="line-clamp-2 text-sm leading-snug font-bold text-card-foreground">
                {displayTitle}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatEventWhen(event, locale)}
              </p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
