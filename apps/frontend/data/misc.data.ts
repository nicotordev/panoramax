/**
 * Deep link to `/events` with the default InstantSearch UI state for the `isFree`
 * toggle (`uiState[indexName].toggle.isFree`), matching `qs`-serialized query keys.
 */
function eventsIsFreeHref(): string {
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME
  if (!indexName) return "/events"
  const key = `${indexName}[toggle][isFree]`
  return `/events?${encodeURIComponent(key)}=true`
}

/** Navegación principal (MVP: feed en `/events`, filtros vía query de InstantSearch). */
const navigation = [
  { key: "home", href: "/" },
  { key: "events", href: "/events" },
  { key: "thisWeek", href: "/this-week" },
  { key: "isFree", href: eventsIsFreeHref() },
] as const

export { navigation }
