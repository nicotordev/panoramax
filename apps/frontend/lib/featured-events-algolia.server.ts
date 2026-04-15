import type { ApiTranslationLocale } from "@/lib/api-locale"
import type { Event, EventTranslation } from "@/types/api"
import { algoliasearch } from "algoliasearch"
import "server-only"

type AlgoliaEventHit = {
  objectID?: string
  id?: string
  slug?: string
  source?: string
  sourceType?: Event["sourceType"]
  sourceEventId?: string | null
  sourceUrl?: string
  ticketUrl?: string | null
  importedAt?: string
  lastSeenAt?: string
  title?: string
  subtitle?: string | null
  summary?: string | null
  description?: string | null
  language?: string | null
  imageUrl?: string | null
  imageAttribution?: string | null
  startAt?: string
  endAt?: string | null
  timezone?: string
  allDay?: boolean
  dateText?: string | null
  status?: Event["status"]
  venueName?: string
  address?: string | null
  commune?: string
  city?: string
  region?: string | null
  country?: string
  latitude?: string | null
  longitude?: string | null
  isOnline?: boolean
  locationNotes?: string | null
  isFree?: boolean
  priceMin?: string | null
  priceMax?: string | null
  currency?: string
  priceText?: string | null
  availabilityText?: string | null
  categoryPrimary?: Event["categoryPrimary"]
  categorySecondary?: string | null
  categoriesSource?: string[]
  tags?: string[]
  audience?: Event["audience"]
  editorialLabels?: string[]
  dedupeKey?: string | null
  canonicalEventId?: string | null
  qualityScore?: number | null
  needsReview?: boolean
  reviewNotes?: string | null
  createdAt?: string
  updatedAt?: string
  translations?: EventTranslation[]
}

const VALID_STATUSES = new Set<Event["status"]>([
  "scheduled",
  "cancelled",
  "postponed",
  "sold_out",
  "expired",
  "draft",
])

const VALID_SOURCE_TYPES = new Set<Event["sourceType"]>([
  "editorial",
  "venue",
  "ticketing",
  "organizer",
])

const VALID_CATEGORIES = new Set<Event["categoryPrimary"]>([
  "music",
  "theatre",
  "standup",
  "dance",
  "festival",
  "fair",
  "exhibition",
  "food_drink",
  "family",
  "sports",
  "workshop",
  "special_experience",
])

const VALID_AUDIENCES = new Set<NonNullable<Event["audience"]>>([
  "adult",
  "family",
  "kids",
  "all_ages",
])

function safeIso(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function pickTranslation(
  translations: unknown,
  locale: ApiTranslationLocale
): EventTranslation | null {
  if (!Array.isArray(translations)) return null
  const match =
    translations.find(
      (item): item is EventTranslation =>
        Boolean(item) &&
        typeof item === "object" &&
        "locale" in item &&
        (item as EventTranslation).locale === locale
    ) ?? null

  return match
}

function mapHitToEvent(
  hit: AlgoliaEventHit,
  locale: ApiTranslationLocale
): Event {
  const nowIso = new Date().toISOString()
  const fallbackId = String(hit.id ?? hit.objectID ?? crypto.randomUUID())
  const translation = pickTranslation(hit.translations, locale)
  const status = VALID_STATUSES.has(hit.status ?? "scheduled")
    ? (hit.status ?? "scheduled")
    : "scheduled"
  const sourceType = VALID_SOURCE_TYPES.has(hit.sourceType ?? "editorial")
    ? (hit.sourceType ?? "editorial")
    : "editorial"
  const categoryPrimary = VALID_CATEGORIES.has(
    hit.categoryPrimary ?? "special_experience"
  )
    ? (hit.categoryPrimary ?? "special_experience")
    : "special_experience"
  const audience =
    hit.audience && VALID_AUDIENCES.has(hit.audience) ? hit.audience : null

  return {
    id: fallbackId,
    slug: hit.slug || fallbackId,
    source: hit.source || "algolia",
    sourceType,
    sourceEventId: hit.sourceEventId ?? null,
    sourceUrl: hit.sourceUrl || "",
    ticketUrl: hit.ticketUrl ?? null,
    importedAt: safeIso(hit.importedAt, nowIso),
    lastSeenAt: safeIso(hit.lastSeenAt, nowIso),
    rawTitle: null,
    rawPayload: null,
    title: hit.title || "Evento",
    subtitle: hit.subtitle ?? null,
    summary: hit.summary ?? null,
    description: hit.description ?? null,
    language: hit.language ?? null,
    imageUrl: hit.imageUrl ?? null,
    imageAttribution: hit.imageAttribution ?? null,
    startAt: safeIso(hit.startAt, nowIso),
    endAt: typeof hit.endAt === "string" ? safeIso(hit.endAt, nowIso) : null,
    timezone: hit.timezone || "America/Santiago",
    allDay: Boolean(hit.allDay),
    dateText: hit.dateText ?? null,
    status,
    venueName: hit.venueName || "Sin recinto",
    venueRaw: null,
    address: hit.address ?? null,
    commune: hit.commune || "Sin comuna informada",
    city: hit.city || "Sin ciudad informada",
    region: hit.region ?? null,
    country: hit.country || "CL",
    latitude: hit.latitude ?? null,
    longitude: hit.longitude ?? null,
    isOnline: Boolean(hit.isOnline),
    locationNotes: hit.locationNotes ?? null,
    isFree: Boolean(hit.isFree),
    priceMin: hit.priceMin ?? null,
    priceMax: hit.priceMax ?? null,
    currency: hit.currency || "CLP",
    priceText: hit.priceText ?? null,
    availabilityText: hit.availabilityText ?? null,
    tiers: [],
    categoryPrimary,
    categorySecondary: hit.categorySecondary ?? null,
    categoriesSource: Array.isArray(hit.categoriesSource)
      ? hit.categoriesSource
      : [],
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    audience,
    editorialLabels: Array.isArray(hit.editorialLabels)
      ? hit.editorialLabels
      : [],
    dedupeKey: hit.dedupeKey ?? null,
    canonicalEventId: hit.canonicalEventId ?? null,
    qualityScore:
      typeof hit.qualityScore === "number"
        ? hit.qualityScore
        : (null as number | null),
    needsReview: Boolean(hit.needsReview),
    reviewNotes: hit.reviewNotes ?? null,
    translation,
    createdAt: safeIso(hit.createdAt, nowIso),
    updatedAt: safeIso(hit.updatedAt, nowIso),
  }
}

export async function getFeaturedEventsFromAlgolia(
  locale: ApiTranslationLocale,
  limit = 5
): Promise<Event[]> {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? ""
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY ?? ""
  const baseIndex = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? ""
  const qualityReplica =
    process.env.NEXT_PUBLIC_ALGOLIA_INDEX_QUALITY_DESC_REPLICA ??
    `${baseIndex}_quality_desc`

  if (!appId || !apiKey || !baseIndex) {
    return []
  }

  try {
    const client = algoliasearch(appId, apiKey)
    const response = await client.searchSingleIndex<AlgoliaEventHit>({
      indexName: qualityReplica,
      searchParams: {
        query: "",
        hitsPerPage: limit,
        filters: "status:scheduled",
      },
    })

    return response.hits.map((hit) => mapHitToEvent(hit, locale))
  } catch (error) {
    console.error("[Algolia] Failed to fetch featured events:", error)
    return []
  }
}
