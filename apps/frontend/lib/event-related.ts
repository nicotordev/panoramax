import { nextLocaleToApiLocale } from "@/lib/api-locale"
import serverClient from "@/lib/server.client"
import type { Event } from "@/types/api"

/**
 * Related events: same category, then same commune, then general upcoming.
 * Excludes the current event; max 6 results.
 */
export async function getRelatedEventsForEvent(
  current: Event,
  locale: string,
): Promise<Event[]> {
  const apiLocale = nextLocaleToApiLocale(locale)
  const seen = new Set<string>([current.id])
  const out: Event[] = []

  const pushUnique = (items: Event[]) => {
    for (const e of items) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      out.push(e)
      if (out.length >= 6) return true
    }
    return false
  }

  const byCategory = await serverClient.getEvents({
    limit: 48,
    categoryPrimary: current.categoryPrimary,
    status: "scheduled",
    locale: apiLocale,
  })
  if (pushUnique(byCategory.data)) return out

  const byCommune = await serverClient.getEvents({
    limit: 48,
    commune: current.commune,
    status: "scheduled",
    locale: apiLocale,
  })
  if (pushUnique(byCommune.data)) return out

  const fallback = await serverClient.getEvents({
    limit: 36,
    status: "scheduled",
    locale: apiLocale,
  })
  pushUnique(fallback.data)

  return out
}
