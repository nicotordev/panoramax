import Search from "@/components/search"
import { useTranslations } from "next-intl"
import HeroEventsShowcase from "./hero-events-showcase"
import type { Event, EventsListMeta } from "@/types/api"

interface HeroSectionProps {
  events: Event[]
  eventsMeta: EventsListMeta
}

export default function HeroSection({ events, eventsMeta }: HeroSectionProps) {
  const t = useTranslations("Navigation")

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background">
      {/* Video background with blending effects, layers reversed for visual interest */}
      <div className="absolute inset-0 bg-black/60 mix-blend-darken z-10 pointer-events-none w-full h-full" />
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover scale-110 brightness-90 lg:brightness-100"
          // slightly zoomed, subtle darkening for a bolder look
        >
          <source src="/assets/video/11999048_1920_1080_25fps.mp4" type="video/mp4" />
          <source src="/assets/video/11999048_1920_1080_25fps.webm" type="video/webm" />
        </video>
      </div>

      {/* 2. Capa de Contenido */}
      <div className="relative z-10 flex flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-16 px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8">
            {/* Título o Intro opcional si lo necesitas, si no, vamos directo al Search */}
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-md">
                <span className="relative mr-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                {t("live_events")}
              </div>

              {/* Barra de búsqueda con Glassmorphism extremo */}
              <div className="w-full rounded-2xl">
                <Search
                  applicationId={process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ""}
                  apiKey={process.env.NEXT_PUBLIC_ALGOLIA_API_KEY || ""}
                  indexName={process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || ""}
                  attributes={{
                    primaryText: "title",
                    secondaryText: "description",
                    tertiaryText: "summary",
                    slug: "slug",
                    image: "imageUrl",
                  }}
                  darkMode={true}
                />
              </div>
            </div>
          </div>

          {/* Showcase con animación de entrada suave */}
          <section className="animate-in duration-1000 fill-mode-both fade-in slide-in-from-bottom-8">
            <HeroEventsShowcase events={events} eventsMeta={eventsMeta} />
          </section>
        </main>
      </div>
    </div>
  )
}
