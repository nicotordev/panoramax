"use client"

import dynamic from "next/dynamic"
import type { Event } from "@/types/api"

const ThisWeekEventsMapInner = dynamic(
  () =>
    import("@/components/events/this-week-events-map").then(
      (m) => m.ThisWeekEventsMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[min(70vh,520px)] w-full animate-pulse rounded-3xl border border-white/10 bg-muted/30"
        aria-hidden
      />
    ),
  },
)

export function ThisWeekEventsMapLoader({ events }: { events: Event[] }) {
  return <ThisWeekEventsMapInner events={events} />
}
