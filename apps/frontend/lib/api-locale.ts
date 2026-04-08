/** Matches `TranslationLocale` in `apps/api/prisma/schema.prisma`. */
export type ApiTranslationLocale =
  | "de"
  | "en"
  | "es"
  | "es419"
  | "fr"
  | "it"
  | "zh"

const NEXT_TO_API: Record<string, ApiTranslationLocale> = {
  en: "en",
  es: "es",
  "es-419": "es419",
  de: "de",
  fr: "fr",
  it: "it",
  "zh-CN": "zh",
}

export function nextLocaleToApiLocale(locale: string): ApiTranslationLocale {
  return NEXT_TO_API[locale] ?? "en"
}
