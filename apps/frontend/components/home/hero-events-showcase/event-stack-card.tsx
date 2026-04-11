"use client"

import { EVENT_PLACEHOLDER_IMAGE } from "@/constants/common.constants"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { formatCategoryLabel, formatEventWhen } from "@/lib/home-showcase.utils"
import { cn } from "@/lib/utils"
import type { EventStackCardProps } from "@/types/home-showcase"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useState } from "react"

const positionStyles: Record<EventStackCardProps["position"], string> = {
  left: "w-[min(70vw,220px)] border-white/10 opacity-40 blur-[1px]",
  center:
    "w-[min(85vw,300px)] border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/20",
  right: "w-[min(70vw,220px)] border-white/10 opacity-40 blur-[1px]",
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
      x: "-45%",
      scale: 0.8,
      rotate: -12,
      opacity: 0.5,
      filter: "brightness(0.6) blur(2px)",
    },
    center: {
      x: "0%",
      scale: 1,
      rotate: 0,
      opacity: 1,
      filter: "brightness(1.1) blur(0px)",
    },
    right: {
      x: "45%",
      scale: 0.8,
      rotate: 12,
      opacity: 0.5,
      filter: "brightness(0.6) blur(2px)",
    },
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      scale: 0.5,
      opacity: 0,
      filter: "blur(10px)",
    }),
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      scale: 0.5,
      opacity: 0,
      filter: "blur(10px)",
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
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // Custom quint ease
      }}
      className="absolute inset-0 flex items-center justify-center will-change-transform"
      style={{ zIndex }}
    >
      <Link
        href={`/events/${event.slug || event.id}`}
        className="group relative block transition-transform duration-500 hover:scale-[1.02]"
      >
        <div
          className={cn(
            "relative aspect-3/4 overflow-hidden rounded-3xl border bg-card/20 backdrop-blur-md transition-all duration-500",
            positionStyles[position]
          )}
        >
          {/* Overlay de brillo superior (Glow effect) */}
          <div className="absolute inset-0 z-10 bg-linear-to-br from-white/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <Image
            src={imageSrc}
            alt={displayTitle}
            fill
            className="pointer-events-none object-cover transition-transform duration-700 group-hover:scale-110"
            priority={position === "center"}
            sizes="(max-width: 768px) 80vw, 300px"
            onError={() => setImageSrc(EVENT_PLACEHOLDER_IMAGE.src)}
          />

          {/* Gradiente de información optimizado para OKLCH */}
          <AnimatePresence>
            {position === "center" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/90 via-black/40 to-transparent p-6 pt-12"
              >
                <span className="mb-3 inline-block rounded-lg border border-primary/50 bg-primary/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary-foreground uppercase shadow-sm backdrop-blur-md">
                  {formatCategoryLabel(event.categoryPrimary)}
                </span>

                <h3 className="line-clamp-2 text-base leading-tight font-extrabold text-white drop-shadow-md">
                  {displayTitle}
                </h3>

                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white/70">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {formatEventWhen(event, locale)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
    </motion.div>
  )
}
