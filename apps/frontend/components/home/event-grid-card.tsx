"use client"

import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { useLocale, useTranslations } from "next-intl"
import { AspectRatio } from "../ui/aspect-ratio"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { getEventCardImageSrc } from "./event-card-utils"

interface EventGridCardProps {
  event: Event
  selectedId?: string
  onSelect?: (event: Event) => void
}

export function EventGridCard({
  event,
  selectedId,
  onSelect,
}: EventGridCardProps) {
  const locale = useLocale()
  const t = useTranslations("Common")
  const isSelected = selectedId === event.id
  const imageSrc = getEventCardImageSrc(event.imageUrl)

  return (
    <Card
      size="sm"
      className={cn(
        "w-full flex-shrink-0 cursor-pointer transition-all hover:shadow-lg sm:w-80",
        isSelected ? "ring-2 ring-primary" : ""
      )}
      onClick={() => onSelect?.(event)}
    >
      <AspectRatio ratio={16 / 9}>
        <img
          src={imageSrc}
          alt={event.title}
          className="h-full w-full rounded-t-xl object-cover"
          loading="lazy"
        />
      </AspectRatio>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1">{event.title}</CardTitle>
          <Badge variant={event.isFree ? "secondary" : "default"}>
            {event.isFree ? t("free") : (event.priceText ?? t("paid"))}
          </Badge>
        </div>
        {event.subtitle && (
          <CardDescription className="line-clamp-1">
            {event.subtitle}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">
            {event.venueName}
            {event.city ? `, ${event.city}` : ""}
          </span>
          <span>·</span>
          <span className="shrink-0">
            {new Date(event.startAt).toLocaleString(locale, {
              dateStyle: "medium",
              timeStyle: event.allDay ? undefined : "short",
            })}
          </span>
        </div>
        {event.summary && (
          <div className="line-clamp-2 text-sm text-foreground/80">
            {event.summary}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        {!!event.categoryPrimary && (
          <Badge variant="outline" className="capitalize">
            {event.categoryPrimary.replace("_", " ")}
          </Badge>
        )}
        <div className="ml-auto flex gap-1">
          {event.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="ghost" className="px-1 text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}
