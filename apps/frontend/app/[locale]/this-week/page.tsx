import EventsBentoGrid from "@/components/home/events-bento-grid"
import EventsList from "@/components/home/events-list"
import MainNav from "@/components/layout/main-nav"
import SiteFooter from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import serverClient from "@/lib/server.client"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { HiArrowLeft } from "react-icons/hi2"

type ThisWeekPageProps = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: ThisWeekPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "ThisWeekPage" })
  return {
    title: `${t("title")} · Panoramax`,
    description: t("description"),
  }
}

export default async function ThisWeekPage({ params }: ThisWeekPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("ThisWeekPage")

  const { data: events } = await serverClient.getCurrentWeekEvents({
    limit: 100,
    status: "scheduled",
    locale: nextLocaleToApiLocale(locale),
  })

  const bentoEvents = events.slice(0, 5)
  const listEvents = events.slice(5)

  return (
    <main className="min-h-screen bg-background">
      <MainNav />
      <div className="mx-auto w-full max-w-7xl px-6 pt-24 pb-16 lg:px-8">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-8 -ml-2 inline-flex gap-2 text-muted-foreground hover:text-foreground",
          )}
        >
          <HiArrowLeft className="size-4" />
          {t("backHome")}
        </Link>

        <header className="mb-10 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        {events.length === 0 ? (
          <Card className="border-border/60 bg-card p-8 text-center shadow-sm">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <Link
              href="/events"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 inline-flex rounded-full",
              )}
            >
              {t("browseEvents")}
            </Link>
          </Card>
        ) : (
          <>
            {bentoEvents.length > 0 ? (
              <EventsBentoGrid events={bentoEvents} />
            ) : null}

            {listEvents.length > 0 ? (
              <section className="mx-auto mt-12 w-full max-w-7xl border-t border-border/40 px-0 pt-12 lg:px-0">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                  {t("moreHeading")}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {t("moreDescription")}
                </p>
                <div className="mt-8">
                  <EventsList events={listEvents} layout="grid" />
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  )
}
