import { routing } from "@/i18n/routing"

/**
 * Map the `[locale]` segment to a BCP 47 tag we know Intl accepts.
 * Normalizes underscores (e.g. `en_US`) and matches routing locales case-insensitively.
 */
export function resolveIntlDateLocale(locale: string | undefined): string {
  if (!locale) return routing.defaultLocale
  const normalized = locale.trim().replaceAll("_", "-")
  const exact = routing.locales.find((l) => l === normalized)
  if (exact) return exact
  const caseInsensitive = routing.locales.find(
    (l) => l.toLowerCase() === normalized.toLowerCase()
  )
  if (caseInsensitive) return caseInsensitive
  return routing.defaultLocale
}

export function createDateFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const tag = resolveIntlDateLocale(locale)
  try {
    return new Intl.DateTimeFormat(tag, options)
  } catch {
    return new Intl.DateTimeFormat(routing.defaultLocale, options)
  }
}
