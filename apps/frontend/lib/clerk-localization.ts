import {
  deDE,
  enUS,
  esES,
  esMX,
  frFR,
  itIT,
  zhCN,
} from "@clerk/localizations"

type ClerkPack = typeof enUS

/**
 * Maps next-intl locales (`i18n/routing.ts`) to Clerk component strings.
 * @see https://clerk.com/docs/guides/customizing-clerk/localization
 */
const clerkLocaleByAppLocale: Record<string, ClerkPack> = {
  en: enUS,
  es: esES,
  // Clerk has no es-419; Latin-American Spanish is the closest fit.
  "es-419": esMX,
  de: deDE,
  fr: frFR,
  it: itIT,
  "zh-CN": zhCN,
}

export function clerkLocalizationForAppLocale(appLocale: string): ClerkPack {
  return clerkLocaleByAppLocale[appLocale] ?? enUS
}
