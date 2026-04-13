import { RandomBackground } from "@/components/common/dashboard-background"
import EventsAlgoliaSearch from "@/components/events/events-algolia-search"
import MainNav from "@/components/layout/main-nav"
import { Badge } from "@/components/ui/badge"
import { setRequestLocale } from "next-intl/server"
import { Suspense } from "react"
import { AlertCircle, Loader2 } from "lucide-react" // Asumiendo que usas lucide-react (común con shadcn)

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
    // MEJORA: Se cambió a <main> por semántica y se agregó min-h-screen
    <main className="relative min-h-screen overflow-x-clip pt-12 pb-20">
      <RandomBackground />
      <MainNav />

      {/* MEJORA: Blobs responsivos (más pequeños en móvil, grandes en desktop) */}
      <div className="pointer-events-none absolute top-0 right-[-20%] h-96 w-[80%] rounded-full bg-primary/10 blur-[120px] md:right-[-10%] md:h-125 md:w-[50%] md:blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-20%] h-80 w-[70%] rounded-full bg-blue-500/10 blur-[120px] md:left-[-10%] md:h-100 md:w-[40%] md:blur-[140px]" />

      <div className="relative z-10 container mx-auto mt-12 w-full max-w-7xl px-4 md:px-6">
        {/* MEJORA: Etiqueta <header> encapsulada en panel glassmórfico para máximo contraste con los fondos dinámicos */}
        <header className="mb-14 max-w-3xl space-y-5 rounded-3xl border border-white/20 bg-background/60 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40 md:p-10">
          <Badge
            variant="outline"
            className="mb-2 border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary backdrop-blur-md shadow-sm"
          >
            Descubre panoramas
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm md:text-5xl lg:text-6xl">
            Encuentra tu próximo evento
          </h1>
          <p className="max-w-2xl text-lg font-medium text-foreground/80 drop-shadow-sm md:text-xl">
            Explora cientos de actividades increíbles en tu ciudad, desde
            conciertos y obras de teatro hasta talleres y eventos exclusivos.
          </p>
        </header>

        {algoliaReady ? (
          <Suspense fallback={<SearchLoadingSkeleton />}>
            <EventsAlgoliaSearch
              locale={locale}
              appId={appId}
              apiKey={apiKey}
              indexName={indexName}
            />
          </Suspense>
        ) : (
          <AlgoliaMissingEnv />
        )}
      </div>
    </main>
  )
}

// MEJORA: Se extrajo el fallback a un componente para mantener limpio el JSX principal
function SearchLoadingSkeleton() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-white/20 bg-background/50 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="animate-pulse font-medium text-muted-foreground">
        Cargando experiencias...
      </p>
    </div>
  )
}

// MEJORA: Estado de error más claro y atractivo
function AlgoliaMissingEnv() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/20 bg-destructive/10 px-6 py-16 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
      <div className="flex min-h-16 min-w-16 items-center justify-center rounded-full bg-destructive/20 backdrop-blur-md">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight text-foreground">
          Búsqueda temporalmente no disponible
        </p>
        <p className="mt-2 max-w-md font-medium text-muted-foreground">
          Falta configurar las credenciales del buscador de eventos. Si eres
          administrador, revisa tus variables de entorno.
        </p>
      </div>
    </div>
  )
}
