import EventsAlgoliaSearch from "@/components/events/events-algolia-search"
import MainNav from "@/components/layout/main-nav"
import { Badge } from "@/components/ui/badge"
import { setRequestLocale } from "next-intl/server"
import { Suspense } from "react"

/** Requerido por `InstantSearchNext` (SSR de resultados en el App Router). */
export const dynamic = "force-dynamic"

type EventsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? ""
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY ?? ""
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? ""
  const algoliaReady = Boolean(appId && apiKey && indexName)

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pt-12 pb-20">
      <MainNav />

      <div className="pointer-events-none absolute top-0 right-[-10%] h-125 w-[50%] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-100 w-[40%] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 container mx-auto mt-12 w-full max-w-360 px-4 md:px-6">
        <div className="mb-12 max-w-3xl space-y-4">
          <Badge
            variant="outline"
            className="mb-2 border-primary/20 bg-primary/5 px-3 py-1 text-primary"
          >
            Descubre panoramas
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Encuentra tu próximo evento
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Explora cientos de actividades increíbles en tu ciudad, desde
            conciertos y obras de teatro hasta talleres y eventos exclusivos.
          </p>
        </div>

        {algoliaReady ? (
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Cargando búsqueda…</p>
              </div>
            }
          >
            <EventsAlgoliaSearch
              locale={locale}
              appId={appId}
              apiKey={apiKey}
              indexName={indexName}
            />
          </Suspense>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <p className="text-lg font-medium text-foreground">
              Búsqueda no disponible
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Falta configurar las variables de entorno de Algolia
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
