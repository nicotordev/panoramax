import type { Event, EventsListMeta } from "@/types/api"

export interface HeroEventsShowcaseProps {
  events: Event[]
  eventsMeta: EventsListMeta
}

export interface DotIndicatorsProps {
  count: number
  active: number
  onSelect: (index: number) => void
  getAriaLabel: (index: number) => string
}

export type StackPosition = "left" | "center" | "right"

export interface EventStackCardProps {
  event: Event
  locale: string
  position: StackPosition
  zIndex: number
  direction: number
}

export interface EventStackCardItem {
  event: Event
  position: StackPosition
  zIndex: number
}
