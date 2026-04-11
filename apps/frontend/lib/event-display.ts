import type { Event } from "@/types/api"

export function eventCardTitle(event: Event): string {
  return event.translation?.title?.trim() || event.title
}

export function formatEventEndLine(
  event: Event,
  locale: string,
): string | null {
  if (!event.endAt) return null
  const start = new Date(event.startAt).getTime()
  const end = new Date(event.endAt).getTime()
  if (!Number.isFinite(end) || end <= start) return null
  return new Date(event.endAt).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: event.allDay ? undefined : "short",
  })
}

export function formatPriceRange(event: Event): string | null {
  if (event.isFree) return null
  const min = event.priceMin?.trim()
  const max = event.priceMax?.trim()
  const text = event.translation?.priceText?.trim() || event.priceText?.trim()
  if (text) return text
  if (min && max && min !== max) return `${min} – ${max} ${event.currency}`
  if (min) return `${min} ${event.currency}`
  if (max) return `${max} ${event.currency}`
  return null
}

export function mapsSearchUrl(event: Event): string | null {
  const lat = event.latitude?.trim()
  const lng = event.longitude?.trim()
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }
  const addressQuery = [
    event.venueName,
    event.address,
    event.commune,
    event.city,
    event.country,
  ]
    .filter(Boolean)
    .join(", ")
    .trim()
  if (!addressQuery) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
}

/**
 * Google Maps embed for in-person venues. Uses coordinates when available,
 * otherwise a free-text address. Optional `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`
 * enables the official Embed API; without it, a classic `output=embed` URL is used.
 */
export function googleMapsIframeSrc(event: Event): string | null {
  if (event.isOnline) return null

  const lat = event.latitude?.trim()
  const lng = event.longitude?.trim()
  const addressQuery = [
    event.venueName,
    event.address,
    event.commune,
    event.city,
    event.country,
  ]
    .filter(Boolean)
    .join(", ")
    .trim()

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim()

  if (lat && lng) {
    const center = `${lat},${lng}`
    if (apiKey) {
      return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(apiKey)}&center=${encodeURIComponent(center)}&zoom=15&maptype=roadmap`
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(center)}&z=15&output=embed`
  }

  if (addressQuery) {
    if (apiKey) {
      return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(addressQuery)}`
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=14&output=embed`
  }

  return null
}

const audienceMessageKey: Record<
  NonNullable<Event["audience"]>,
  "audienceAdult" | "audienceFamily" | "audienceKids" | "audienceAllAges"
> = {
  adult: "audienceAdult",
  family: "audienceFamily",
  kids: "audienceKids",
  all_ages: "audienceAllAges",
}

export function audienceTranslationKey(
  audience: Event["audience"],
): "audienceAdult" | "audienceFamily" | "audienceKids" | "audienceAllAges" | null {
  if (!audience) return null
  return audienceMessageKey[audience] ?? null
}
