import { buttonVariants } from "@/data/variants.data"
import { googleMapsIframeSrc, mapsSearchUrl } from "@/lib/event-display"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { getTranslations } from "next-intl/server"

type EventMapEmbedProps = {
  event: Event
}

export default async function EventMapEmbed({ event }: EventMapEmbedProps) {
  const t = await getTranslations("EventPage")
  const iframeSrc = googleMapsIframeSrc(event)
  const externalUrl = mapsSearchUrl(event)

  if (!iframeSrc) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {t("mapEmbedTitle")}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm ring-1 ring-border/40">
        <div className="relative aspect-[4/3] w-full min-h-[220px] sm:aspect-video sm:min-h-[280px]">
          <iframe
            title={t("mapEmbedTitle")}
            src={iframeSrc}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex w-full justify-center sm:w-auto",
          )}
        >
          {t("mapOpenTab")}
        </a>
      ) : null}
    </section>
  )
}
