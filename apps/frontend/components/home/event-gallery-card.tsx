"use client"

import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { useTranslations } from "next-intl"
import { Badge } from "../ui/badge"
import { Card } from "../ui/card"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import Image from "next/image";

interface EventGalleryCardProps {
  event: Event
  index: number
  selectedId?: string
  onSelect?: (event: Event) => void
}

export function EventGalleryCard({
  event,
  index,
  selectedId,
  onSelect,
}: EventGalleryCardProps) {
  const t = useTranslations("Common")
  const isSelected = selectedId === event.id
  const imageSrc = getEventCardImageSrc(event.imageUrl)

  return (
    <div
      className={cn(
        "group relative cursor-pointer transition-all duration-300",
        index % 2 === 1 ? "mt-12" : "mt-0",
        isSelected
          ? "z-10 scale-105"
          : "opacity-80 hover:scale-[1.02] hover:opacity-100"
      )}
      onClick={() => onSelect?.(event)}
    >
      <Card
        size="sm"
        className={cn(
          "h-full overflow-hidden border-none bg-background/50 shadow-xl backdrop-blur-sm transition-all duration-300",
          isSelected
            ? "ring-2 shadow-primary/20 ring-primary"
            : "ring-1 ring-border/50"
        )}
      >
        <div className="relative aspect-3/4 w-full">
          <Image
            src={imageSrc}
            alt={event.title}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
              isSelected ? "scale-105" : "group-hover:scale-110"
            )}
            loading="lazy"
            width={220}
            height={120}
          />

          <div
            className={cn(
              "absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/80 via-black/20 to-transparent p-4 transition-opacity duration-300",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <p className="line-clamp-2 text-sm leading-tight font-bold text-white">
              {event.title}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="h-4 px-1.5 py-0 text-[10px]"
              >
                {event.isFree ? t("free") : (event.priceMin ?? t("paid"))}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
