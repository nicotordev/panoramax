import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"
import en from "../messages/en.json"
import es from "../messages/es.json"
import es419 from "../messages/es-419.json"
import de from "../messages/de.json"
import fr from "../messages/fr.json"
import it from "../messages/it.json"
import zhCN from "../messages/zh-CN.json"

const messagesByLocale = {
  en,
  es,
  "es-419": es419,
  de,
  fr,
  it,
  "zh-CN": zhCN,
} as const

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: messagesByLocale[locale],
  }
})
