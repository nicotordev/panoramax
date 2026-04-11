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
  const showSidebar = hasMapEmbed || hasPricingColumn

  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <article className="mx-auto max-w-6xl px-6 pt-28 pb-20 lg:px-10">
        <nav className="mb-8">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex gap-2 text-muted-foreground hover:text-foreground"
            )}
          >
            <HiArrowLeft className="size-4 shrink-0" aria-hidden />
            {t("backHome")}
          </Link>
        </nav>

        <header className="mb-8 space-y-3">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {formatCategoryLabel(event.categoryPrimary)}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {event.title}
          </h1>
          {event.subtitle ? (
            <p className="text-lg text-muted-foreground">{event.subtitle}</p>
          ) : null}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="inline-flex items-center gap-2">
              <HiCalendarDays className="size-4 shrink-0" aria-hidden />
              <span>{whenLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <HiMapPin className="size-4 shrink-0" aria-hidden />
              <span>{whereLabel}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {event.allDay ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                {t("allDay")}
              </span>
            ) : null}
            {event.isFree ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t("freeEvent")}
              </span>
            ) : null}
            {event.isOnline ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                {t("onlineEvent")}
              </span>
            ) : null}
          </div>
          {event.timezone ? (
            <p className="text-xs text-muted-foreground">
              {t("timezone")}: {event.timezone}
            </p>
          ) : null}
        </header>

        {event.imageUrl ? (
          <figure className="mb-10 overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm">
            <div className="relative aspect-video w-full">
              <Image
                src={getEventCardImageSrc(event.imageUrl)}
                alt={event.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1152px"
                priority
                unoptimized
              />
            </div>
            {event.imageAttribution ? (
              <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">
                {t("imageCredit")}: {event.imageAttribution}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {event.ticketUrl || event.sourceUrl ? (
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {event.ticketUrl ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                )}
              >
                <HiTicket className="size-4 shrink-0" aria-hidden />
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
                  "inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                )}
              >
                {t("officialLink")}
                <HiArrowUpRight className="size-4 shrink-0" aria-hidden />
              </a>
            ) : null}
          </div>
        ) : null}

        {bodyText ? (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {t("details")}
            </h2>
            <p className="text-base leading-7 whitespace-pre-wrap text-foreground/90">
              {bodyText}
            </p>
          </section>
        ) : null}

        {showSidebar ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="space-y-10 lg:col-span-7">
              <EventPracticalGrid event={event} locale={locale} />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("status")}:
                </span>{" "}
                <span className="capitalize">{statusLabel}</span>
              </p>
            </div>
            <aside className="space-y-10 lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
              <EventMapEmbed event={event} />
              <EventTiersSection event={event} />
            </aside>
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            <EventPracticalGrid event={event} locale={locale} />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("status")}:
              </span>{" "}
              <span className="capitalize">{statusLabel}</span>
            </p>
          </div>
        )}

        <EventRelatedEvents event={event} locale={locale} />
      </article>
      <SiteFooter />
    </main>
  )
}
