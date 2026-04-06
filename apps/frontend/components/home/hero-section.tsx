import { navigation } from "@/data/misc.data"
import { Link } from "@/i18n/navigation"
import type { Event, EventsListMeta } from "@/types/api"
import { useTranslations } from "next-intl"
import { HiArrowLongRight } from "react-icons/hi2"
import Logo from "../common/logo"
import HeroEventsShowcase from "./hero-events-showcase"
import MobileMenu from "./mobile-menu"

interface HeroSectionProps {
  events: Event[]
  eventsMeta: EventsListMeta
}

export default function HeroSection({ events, eventsMeta }: HeroSectionProps) {
  const t = useTranslations("Navigation")

  return (
    <div className="relative w-full overflow-hidden bg-background">
      <video
        src="/assets/video/11999048_1920_1080_25fps.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-10 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-20 bg-linear-to-b from-background/85 via-background/45 to-background/20"
      />
      <div className="absolute inset-0 z-20 bg-linear-to-b from-primary/35 to-transparent" />

      <div className="relative z-30 flex flex-1 flex-col">
        <header className="shrink-0">
          <nav
            aria-label={t("globalAria")}
            className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
          >
            <div className="flex lg:flex-1">
              <Logo />
            </div>
            <MobileMenu />
            <div className="hidden lg:flex lg:gap-x-12">
              {navigation.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-sm/6 font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>
            <div className="hidden lg:flex lg:flex-1 lg:justify-end">
              <Link
                href="#"
                className="inline-flex items-center gap-1 text-sm/6 font-semibold text-foreground transition-colors hover:text-primary"
              >
                {t("login")} <HiArrowLongRight className="size-4" aria-hidden />
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex flex-1 flex-col pb-16 lg:pb-24">
          <div className="mx-auto flex w-full max-w-7xl flex-1 px-6 pt-4 lg:px-8 lg:pt-2">
            <HeroEventsShowcase events={events} eventsMeta={eventsMeta} />
          </div>
        </main>
      </div>
    </div>
  )
}
