import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "es", "es-419", "de", "fr", "it", "zh-CN"],
  defaultLocale: "en",
  localePrefix: "as-needed",
})
