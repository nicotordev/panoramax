import type { Event } from "@/types/api"

export function formatStatInt(n: number, locale: string): string {
  return Math.max(0, Math.floor(n)).toLocaleString(locale)
}

export const wrapIndex = (i: number, len: number) => ((i % len) + len) % len

export function formatCategoryLabel(cat: Event["categoryPrimary"]): string {
  return cat.replace(/_/g, " ")
}

export function formatEventWhen(event: Event, locale: string): string {
  const text = event.dateText?.trim()
  if (text) return text

  return new Date(event.startAt).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: event.allDay ? undefined : "short",
  })
}

export function formatEventLocation(event: Event): string {
  const parts = [event.venueName, event.commune || event.city].filter(Boolean)
  return parts.join(", ")
}
