"use client"

import type { Event } from "@/types/api"
import { EventGalleryCard } from "./event-gallery-card"
import { EventGridCard } from "./event-grid-card"

interface EventsListProps {
  events: Event[]
  layout?: "grid" | "gallery"
  selectedId?: string
  onEventSelect?: (event: Event) => void
}

export default function EventsList({
  events,
  layout = "grid",
  selectedId,
  onEventSelect,
}: EventsListProps) {
  if (layout === "gallery") {
    return (
      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent grid h-[600px] grid-cols-2 gap-4 overflow-y-auto pr-4 sm:grid-cols-3">
        {events.map((event, i) => (
          <EventGalleryCard
            key={event.id}
            event={event}
            index={i}
            selectedId={selectedId}
            onSelect={onEventSelect}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-wrap gap-6">
      {events.map((event) => (
        <EventGridCard
          key={event.id}
          event={event}
          selectedId={selectedId}
          onSelect={onEventSelect}
        />
      ))}
    </div>
  )
}
