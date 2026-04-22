import EventsBentoGrid from "@/components/home/events-bento-grid"
import EventsList from "@/components/home/events-list"
import MainNav from "@/components/layout/main-nav"
import SiteFooter from "@/components/layout/site-footer"
import { ThisWeekEventsMapLoader } from "@/components/events/this-week-events-map-loader"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import serverClient from "@/lib/server.client"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { HiArrowLeft } from "react-icons/hi2"
import { RandomBackground } from "@/components/common/dashboard-background"

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
    <main className="relative min-h-screen overflow-clip pt-12">
      <RandomBackground />

      <MainNav />

      <div className="pointer-events-none absolute top-0 right-[-20%] h-96 w-[80%] rounded-full bg-primary/10 blur-[120px] md:right-[-10%] md:h-125 md:w-[50%] md:blur-[140px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-20%] h-80 w-[70%] rounded-full bg-blue-500/10 blur-[120px] md:left-[-10%] md:h-100 md:w-[40%] md:blur-[140px]" />

      <div className="relative z-10 container mx-auto mt-12 w-full max-w-7xl px-4 md:px-6">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-6 inline-flex gap-2 rounded-full border border-white/10 bg-background/30 text-muted-foreground backdrop-blur-md hover:bg-background/50 hover:text-foreground dark:border-white/5"
          )}
        >
          <HiArrowLeft className="size-4" />
          {t("backHome")}
        </Link>

        <section className="mx-auto mb-8 w-full max-w-7xl px-6 lg:px-8">
          <header className="mb-4 space-y-5 rounded-3xl border border-white/20 bg-background/60 p-8 shadow-2xl backdrop-blur-xl md:p-10 dark:border-white/10 dark:bg-black/40">
            <Badge
              variant="outline"
              className="mb-2 border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary shadow-sm backdrop-blur-md"
            >
              {t("eyebrow")}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm md:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-lg font-medium text-foreground/80 drop-shadow-sm md:text-xl">
              {t("description")}
            </p>
          </header>
        </section>

        {events.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/20 bg-background/50 px-6 py-16 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40">
            <p className="text-xl font-bold tracking-tight text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="mt-2 max-w-md font-medium text-muted-foreground">
              {t("emptyDescription")}
            </p>
            <Link
              href="/events"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 inline-flex rounded-full shadow-lg"
              )}
            >
              {t("browseEvents")}
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            <section className="mx-auto mb-8 w-full max-w-7xl px-6 py-4 lg:px-8">
              <header className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {t("mapTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground md:text-base">
                  {t("mapDescription")}
                </p>
              </header>
              <ThisWeekEventsMapLoader events={events} />
            </section>

            {bentoEvents.length > 0 ? (
              <EventsBentoGrid events={bentoEvents} />
            ) : null}

            {listEvents.length > 0 ? (
              <section className="mx-auto mb-8 w-full max-w-7xl px-6 py-4 lg:px-8">
                <header className="mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground drop-shadow-sm">
                    {t("moreHeading")}
                  </h2>
                  <p className="mt-3 max-w-2xl text-lg font-medium text-foreground/80 drop-shadow-sm">
                    {t("moreDescription")}
                  </p>
                </header>
                <div className="mt-4">
                  <EventsList events={listEvents} layout="grid" />
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
      <div className="mt-20">
        <SiteFooter />
      </div>
    </main>
  )
}
