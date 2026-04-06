export interface EventTier {
  id: string
  eventId: string
  name: string
  price?: string | null
  fee?: string | null
  totalPrice?: string | null
  currency: string
  sortOrder: number
  rawText?: string | null
  translation?: EventTierTranslation | null
  createdAt: string
  updatedAt: string
}

export interface EventTierTranslation {
  locale: "de" | "en" | "es" | "es419" | "fr" | "it" | "zh"
  name?: string | null
  rawText?: string | null
  autoTranslated?: boolean
  sourceLocale?: string | null
  provider?: string | null
  version?: number
  updatedAt?: string
}

export interface EventTranslation {
  locale: "de" | "en" | "es" | "es419" | "fr" | "it" | "zh"
  title?: string | null
  subtitle?: string | null
  summary?: string | null
  description?: string | null
  dateText?: string | null
  venueName?: string | null
  locationNotes?: string | null
  priceText?: string | null
  availabilityText?: string | null
  autoTranslated?: boolean
  sourceLocale?: string | null
  provider?: string | null
  version?: number
  updatedAt?: string
}

// Event model (as per schema.prisma)
export interface Event {
  id: string
  slug: string
  source: string
  sourceType: "editorial" | "venue" | "ticketing" | "organizer"
  sourceEventId?: string | null
  sourceUrl: string
  ticketUrl?: string | null
  importedAt: string
  lastSeenAt: string
  rawTitle?: string | null
  rawPayload?: object | null
  title: string
  subtitle?: string | null
  summary?: string | null
  description?: string | null
  language?: string | null
  imageUrl?: string | null
  imageAttribution?: string | null
  startAt: string
  endAt?: string | null
  timezone: string
  allDay: boolean
  dateText?: string | null
  status:
    | "scheduled"
    | "cancelled"
    | "postponed"
    | "sold_out"
    | "expired"
    | "draft"
  venueName: string
  venueRaw?: string | null
  address?: string | null
  commune: string
  city: string
  region?: string | null
  country: string
  latitude?: string | null // Prisma Decimal fields as strings
  longitude?: string | null
  isOnline: boolean
  locationNotes?: string | null
  isFree: boolean
  priceMin?: string | null // Prisma Decimal fields as strings
  priceMax?: string | null
  currency: string
  priceText?: string | null
  availabilityText?: string | null
  tiers?: EventTier[]
  categoryPrimary:
    | "music"
    | "theatre"
    | "standup"
    | "dance"
    | "festival"
    | "fair"
    | "exhibition"
    | "food_drink"
    | "family"
    | "sports"
    | "workshop"
    | "special_experience"
  categorySecondary?: string | null
  categoriesSource: string[]
  tags: string[]
  audience?: "adult" | "family" | "kids" | "all_ages" | null
  editorialLabels: string[]
  dedupeKey?: string | null
  canonicalEventId?: string | null
  qualityScore?: number | null
  needsReview: boolean
  reviewNotes?: string | null
  translation?: EventTranslation | null
  createdAt: string
  updatedAt: string
}

/** Meta de `GET /api/v1/events` (`items` + `total` / `page` / `limit`). */
export type EventsListMeta = {
  total: number
  page: number
  limit: number
  weekRange?: {
    start: string
    end: string
  }
  stats: {
    communes: number
    free: number
  }
}
