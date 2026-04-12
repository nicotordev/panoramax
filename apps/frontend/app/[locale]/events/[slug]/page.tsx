import EventMapEmbed from "@/components/events/event-map-embed"
import EventPracticalGrid from "@/components/events/event-practical-grid"
import EventRelatedEvents from "@/components/events/event-related-events"
import EventTiersSection from "@/components/events/event-tiers-section"
import MainNav from "@/components/layout/main-nav"
import SiteFooter from "@/components/layout/site-footer"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import { getEventCardImageSrc } from "@/lib/event-card.utils"
import { googleMapsIframeSrc } from "@/lib/event-display"
import {
  formatCategoryLabel,
  formatEventLocation,
  formatEventWhen,
} from "@/lib/home-showcase.utils"
import serverClient from "@/lib/server.client"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/api"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  HiArrowLeft,
  HiArrowUpRight,
  HiCalendarDays,
  HiMapPin,
  HiTicket,
} from "react-icons/hi2"

type EventPageProps = {
  params: Promise<{ locale: string; slug: string }>
}

function eventDescription(event: Event): string | null {
  return (
    event.translation?.description?.trim() ||
    event.description?.trim() ||
    event.translation?.summary?.trim() ||
    event.summary?.trim() ||
    null
  )
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: "EventPage" })
  const event = await serverClient.getEventForPublicPage(slug, {
    locale: nextLocaleToApiLocale(locale),
  })
  if (!event) {
    return { title: t("notFoundTitle") }
  }
  const desc = event.description?.trim()
  const summary =
    event.summary?.trim() || (desc ? desc.slice(0, 200) : undefined)
  return {
    title: `${event.title} · Panoramax`,
    description: summary || undefined,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations("EventPage")

  const event = await serverClient.getEventForPublicPage(slug, {
    locale: nextLocaleToApiLocale(locale),
  })

  if (!event) {
    notFound()
  }

  const whenLabel = formatEventWhen(event, locale)
  const whereLabel = formatEventLocation(event)
  const bodyText = eventDescription(event)
  const statusLabel = event.status.replace(/_/g, " ")
  const hasMapEmbed = Boolean(googleMapsIframeSrc(event))
  const priceTextBlurb =
    event.translation?.priceText?.trim() || event.priceText?.trim() || null
  const hasStructuredTiers = (event.tiers?.length ?? 0) > 0
  const hasPricingColumn = hasStructuredTiers || Boolean(priceTextBlurb)

  const hasSidebar = Boolean(
    event.imageUrl ||
    event.ticketUrl ||
    event.sourceUrl ||
    hasPricingColumn ||
    hasMapEmbed
  )

  return (
    <main className="min-h-screen bg-background selection:bg-primary/20">
      <MainNav />
      <article className="mx-auto max-w-6xl px-6 pt-24 pb-20 lg:px-10">
        <nav className="mb-10 group">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 rounded-full pr-4"
            )}
          >
            <HiArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-1" aria-hidden />
            {t("backHome")}
          </Link>
        </nav>

        <div className={cn("grid gap-12 lg:items-start", hasSidebar ? "lg:grid-cols-12" : "")}>
          {/* Main Content */}
          <div className={cn("space-y-12", hasSidebar ? "lg:col-span-7 xl:col-span-7" : "max-w-4xl mx-auto")}>
            <header className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase shadow-sm">
                  {formatCategoryLabel(event.categoryPrimary)}
                </span>
                {event.allDay ? (
                  <span className="inline-flex rounded-full bg-muted shadow-sm border border-border/50 px-3 py-1 text-xs font-semibold text-foreground">
                    {t("allDay")}
                  </span>
                ) : null}
                {event.isFree ? (
                  <span className="inline-flex rounded-full bg-emerald-500/10 shadow-sm border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("freeEvent")}
                  </span>
                ) : null}
                {event.isOnline ? (
                  <span className="inline-flex rounded-full bg-blue-500/10 shadow-sm border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {t("onlineEvent")}
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-5xl xl:text-6xl text-balance">
                  {event.title}
                </h1>
                {event.subtitle ? (
                  <p className="text-xl leading-relaxed text-muted-foreground text-balance">
                    {event.subtitle}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 py-5 text-base text-muted-foreground border-y border-border/50 bg-muted/20 px-4 sm:px-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-background shadow-sm border border-border/50 text-foreground">
                    <HiCalendarDays className="size-5" aria-hidden />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{whenLabel}</span>
                    {event.timezone ? (
                      <span className="text-xs opacity-80">{t("timezone")}: {event.timezone}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-background shadow-sm border border-border/50 text-foreground">
                    <HiMapPin className="size-5" aria-hidden />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-semibold text-foreground">{whereLabel}</span>
                  </div>
                </div>
              </div>
            </header>

            {bodyText ? (
              <section className="space-y-5 lg:pr-8">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {t("details")}
                </h2>
                <div className="prose prose-gray dark:prose-invert max-w-none text-lg leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {bodyText}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-4">
              <div className="bg-muted/10">
                <EventPracticalGrid event={event} locale={locale} />
              </div>
              <div className="flex items-center justify-between bg-muted/30 px-6 py-4 sm:px-8 text-sm rounded-full">
                 <span className="font-medium text-muted-foreground">{t("status")}</span>
                 <span className="capitalize inline-flex items-center rounded-full bg-background shadow-sm border border-border/50 px-3 py-1 text-xs font-bold text-foreground">
                   {statusLabel}
                 </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {hasSidebar && (
            <aside className="space-y-8 lg:sticky lg:top-28 lg:col-span-5 xl:col-span-5 lg:self-start">
              {event.imageUrl ? (
                <figure className="overflow-hidden bg-card shadow-xl transition-all duration-300 hover:shadow-2xl">
                  <div className="group relative aspect-[4/3] w-full bg-muted/50 overflow-hidden">
                    <Image
                      src={getEventCardImageSrc(event.imageUrl)}
                      alt={event.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 500px"
                      priority
                      unoptimized
                    />
                  </div>
                  {event.imageAttribution ? (
                    <figcaption className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border/50 bg-muted/20">
                      {t("imageCredit")}: {event.imageAttribution}
                    </figcaption>
                  ) : null}
                </figure>
              ) : null}

              {(event.ticketUrl || event.sourceUrl || hasPricingColumn) && (
                <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-lg flex flex-col">
                  {(event.ticketUrl || event.sourceUrl) && (
                    <div className="p-6 sm:p-8 space-y-4">
                      {event.ticketUrl ? (
                        <a
                          href={event.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "default", size: "lg" }),
                            "flex w-full group items-center justify-center gap-2 rounded-xl text-base font-bold shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                          )}
                        >
                          <HiTicket className="size-5 shrink-0 transition-transform group-hover:-rotate-12" aria-hidden />
                          {t("tickets")}
                        </a>
                      ) : null}
                      {event.sourceUrl ? (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "flex w-full group items-center justify-center gap-2 rounded-xl text-base font-semibold border-border/50 hover:bg-muted/50 transition-colors"
                          )}
                        >
                          {t("officialLink")}
                          <HiArrowUpRight className="size-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  )}

                  {hasPricingColumn && (
                    <div className={cn("bg-card", (event.ticketUrl || event.sourceUrl) ? "border-t border-border/50 p-6 sm:p-8" : "p-6 sm:p-8")}>
                      <EventTiersSection event={event} />
                    </div>
                  )}
                </div>
              )}

              {hasMapEmbed && (
                <div>
                  <EventMapEmbed event={event} />
                </div>
              )}
            </aside>
          )}
        </div>

        <div className="pt-16">
          <EventRelatedEvents event={event} locale={locale} />
        </div>
      </article>
      <SiteFooter />
    </main>
  )
}
