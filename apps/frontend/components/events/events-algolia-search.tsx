"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Link } from "@/i18n/navigation"
import { formatCategoryLabel } from "@/lib/home-showcase.utils"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import { liteClient as algoliasearch } from "algoliasearch/lite"
import type { BaseHit } from "instantsearch.js"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FilterX,
  MapPin,
  SearchIcon,
} from "lucide-react"
import Image from "next/image"
import { useCallback, useMemo } from "react"
import {
  Configure,
  useHits,
  usePagination,
  useRefinementList,
  useSearchBox,
} from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"

export type EventsAlgoliaSearchProps = {
  locale: string
  appId: string
  apiKey: string
  indexName: string
}

const AUDIENCE_FACET_LABELS: Record<string, string> = {
  adult: "Adultos",
  family: "Familia",
  kids: "Niños",
  all_ages: "Todas las edades",
}

function formatAudienceFacetLabel(value: string): string {
  return AUDIENCE_FACET_LABELS[value] ?? value.replace(/_/g, " ")
}

function formatCategoryFacetLabel(value: string): string {
  return formatCategoryLabel(value as Event["categoryPrimary"])
}

function CustomSearchBox() {
  const { query, refine } = useSearchBox()

  return (
    <div className="relative mb-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <Input
        type="search"
        placeholder="Busca eventos, artistas o lugares..."
        className="h-14 w-full rounded-2xl border-primary/20 bg-background/60 pl-12 text-lg shadow-sm backdrop-blur-md focus-visible:ring-primary/50"
        value={query}
        onChange={(e) => refine(e.target.value)}
      />
    </div>
  )
}

function CustomRefinementList({
  attribute,
  title,
  transformLabel,
}: {
  attribute: string
  title: string
  transformLabel?: (value: string) => string
}) {
  const transformItems = useCallback(
    (
      list: {
        value: string
        label: string
        count: number
        isRefined: boolean
      }[]
    ) => {
      if (!transformLabel) return list
      return list.map((item) => ({
        ...item,
        label: transformLabel(item.value),
      }))
    },
    [transformLabel]
  )

  const connectorProps = useMemo(
    () => (transformLabel ? { attribute, transformItems } : { attribute }),
    [attribute, transformItems, transformLabel]
  )

  const { items, refine } = useRefinementList(connectorProps)

  if (items.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-base font-bold tracking-tight">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <label
            key={item.value}
            className="group flex cursor-pointer items-start gap-3"
          >
            <Checkbox
              checked={item.isRefined}
              onCheckedChange={() => refine(item.value)}
              className="mt-0.5 border-muted-foreground/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <span className="flex-1 text-sm leading-tight font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              {item.label}
            </span>
            <Badge
              variant="secondary"
              className="mt-0.5 ml-auto bg-muted/50 px-1.5 py-0.5 text-[10px] leading-none font-normal"
            >
              {item.count}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  )
}

function CustomHits({ locale }: { locale: string }) {
  const { items } = useHits<BaseHit>()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-background/50 px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FilterX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-xl font-bold tracking-tight">
          No se encontraron eventos
        </h3>
        <p className="max-w-md text-muted-foreground">
          No hay eventos que coincidan con tu búsqueda. Intenta ajustar los
          filtros o cambiar los términos de búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((hit) => {
        const eventHit = hit as unknown as Event
        const slug = eventHit.slug || hit.objectID
        const title = eventHit.title || "Evento sin título"
        const imageUrl =
          eventHit.imageUrl ||
          "https://placehold.co/600x400/222/FFF?text=Panoramax"

        return (
          <Link key={hit.objectID} href={`/events/${slug}`}>
            <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/50 bg-background/70 py-0 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-2xl">
              <div className="relative aspect-4/3 overflow-hidden bg-muted">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-60" />

                {eventHit.isFree && (
                  <Badge className="bg-opacity-90 absolute top-3 right-3 border-none bg-green-500 text-white shadow-md backdrop-blur-md hover:bg-green-600">
                    Gratis
                  </Badge>
                )}

                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="border-none bg-background/30 text-xs text-white backdrop-blur-md hover:bg-background/40"
                  >
                    {eventHit.categoryPrimary
                      ? formatCategoryLabel(eventHit.categoryPrimary)
                      : "General"}
                  </Badge>
                </div>
              </div>

              <CardContent className="relative flex flex-1 flex-col gap-3 p-5">
                <h3 className="line-clamp-2 text-lg leading-tight font-bold transition-colors group-hover:text-primary">
                  {title}
                </h3>

                <div className="mt-auto space-y-2.5 pt-2">
                  {eventHit.city && (
                    <div className="flex items-start text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 mr-2.5 h-4 w-4 shrink-0 text-primary/70" />
                      <span className="line-clamp-1">
                        {eventHit.venueName ? `${eventHit.venueName}, ` : ""}
                        {eventHit.city}
                      </span>
                    </div>
                  )}

                  {eventHit.startAt && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-2.5 h-4 w-4 shrink-0 text-primary/70" />
                      <span className="line-clamp-1">
                        {new Date(eventHit.startAt).toLocaleDateString(locale, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        {eventHit.endAt &&
                          ` - ${new Date(eventHit.endAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}`}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function CustomPagination() {
  const { pages, currentRefinement, refine, isFirstPage, isLastPage } =
    usePagination()

  if (pages.length <= 1) return null

  return (
    <div className="mt-16 mb-8 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => refine(currentRefinement - 1)}
        disabled={isFirstPage}
        className="h-10 w-10 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((page) => (
          <Button
            key={page}
            variant={currentRefinement === page ? "default" : "ghost"}
            size="sm"
            onClick={() => refine(page)}
            className={cn(
              "h-10 min-w-10 rounded-full transition-all",
              currentRefinement === page
                ? "shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
            )}
          >
            {page + 1}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => refine(currentRefinement + 1)}
        disabled={isLastPage}
        className="h-10 w-10 rounded-full border-border/50 hover:bg-primary/5 hover:text-primary"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function EventsAlgoliaSearch({
  locale,
  appId,
  apiKey,
  indexName,
}: EventsAlgoliaSearchProps) {
  const searchClient = useMemo(() => {
    if (!appId || !apiKey) return null
    const client = algoliasearch(appId, apiKey)
    client.addAlgoliaAgent("algolia-panoramax")
    return client
  }, [appId, apiKey])

  if (!searchClient) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Configurando búsqueda...</p>
      </div>
    )
  }

  return (
    <InstantSearchNext
      searchClient={searchClient}
      indexName={indexName}
      routing
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure hitsPerPage={12} />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="w-full shrink-0 lg:w-72">
          <div className="sticky top-24 rounded-3xl border border-border/50 bg-card/30 p-6 shadow-sm backdrop-blur-2xl md:p-8">
            <div className="mb-8 flex items-center gap-2 border-b border-border/50 pb-4 text-foreground">
              <FilterX className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Filtros</h2>
            </div>

            <CustomRefinementList attribute="city" title="Ciudad" />
            <CustomRefinementList
              attribute="categoryPrimary"
              title="Categoría"
              transformLabel={formatCategoryFacetLabel}
            />
            <CustomRefinementList
              attribute="audience"
              title="Público"
              transformLabel={formatAudienceFacetLabel}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <CustomSearchBox />
          <div className="flex-1">
            <CustomHits locale={locale} />
            <CustomPagination />
          </div>
        </main>
      </div>
    </InstantSearchNext>
  )
}
