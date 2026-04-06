const EVENT_PLACEHOLDER_IMAGE =
  "/assets/img/placeholders/pexels-danielnouri-8448579-optimized.webp"

export function isPlaceholderEventImage(url?: string | null): boolean {
  return !url || url.startsWith("data:image/") || url.includes("placeholder")
}

export function getEventCardImageSrc(url?: string | null): string {
  return isPlaceholderEventImage(url) ? EVENT_PLACEHOLDER_IMAGE : url!
}
