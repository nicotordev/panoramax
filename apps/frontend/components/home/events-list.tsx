"use client"

import type { Event } from "@/types/api"
import "swiper/css"
import "swiper/css/free-mode"
import { FreeMode, Mousewheel } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"
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
      {events.map((event) => (
        <SwiperSlide
          key={event.id}
          className="h-auto! w-[min(100%,18rem)]! sm:w-80!"
        >
          <EventGridCard
            event={event}
            selectedId={selectedId}
            onSelect={onEventSelect}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
