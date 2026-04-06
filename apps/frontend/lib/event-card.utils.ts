import { EVENT_PLACEHOLDER_IMAGE } from "@/constants/common.constants"

export function isPlaceholderEventImage(url?: string | null): boolean {
  return !url || url.startsWith("data:image/") || url.includes("placeholder")
}

export function getEventCardImageSrc(url?: string | null): string {
  return isPlaceholderEventImage(url) ? EVENT_PLACEHOLDER_IMAGE.src : url!
}
