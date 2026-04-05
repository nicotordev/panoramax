import { HiArrowLongRight } from "react-icons/hi2"
import { buttonVariants } from "@/data/variants.data"
import { cn } from "@/lib/utils"
import Logo from "../common/logo"
import MobileMenu from "./mobile-menu"
import { navigation } from "@/data/misc.data"
import type { Event } from "@/types/api"
import EventsList from "./events-list"

interface HeroSectionProps {
  events: Event[]
}

export default function HeroSection({ events }: HeroSectionProps) {
  return (
    <div className="w-full bg-background">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <Logo />
          </div>
          <MobileMenu />
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm/6 font-semibold text-foreground"
              >
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a
              href="#"
              className="inline-flex items-center gap-1 text-sm/6 font-semibold text-foreground"
            >
              Log in <HiArrowLongRight className="size-4" aria-hidden />
            </a>
          </div>
        </nav>
      </header>
      <main className="w-full">
        <div className="relative w-full">
          <svg
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-256 w-full mask-[radial-gradient(32rem_32rem_at_center,white,transparent)] stroke-border"
          >
            <defs>
              <pattern
                x="50%"
                y={-1}
                id="hero-grid-pattern"
                width={200}
                height={200}
                patternUnits="userSpaceOnUse"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-muted">
              <path
                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect
              fill="url(#hero-grid-pattern)"
              width="100%"
              height="100%"
              strokeWidth={0}
            />
          </svg>
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 left-1/2 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
          >
            <div
              style={{
                clipPath:
                  "polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)",
              }}
              className="aspect-801/1036 w-200.25 bg-linear-to-tr from-primary/30 to-chart-2/40 opacity-30"
            />
          </div>
          <div className="overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 pt-36 pb-32 sm:pt-60 lg:px-8 lg:pt-32">
              <div className="mx-auto max-w-2xl gap-x-14 lg:mx-0 lg:flex lg:max-w-none lg:items-center">
                <div className="relative w-full lg:max-w-xl lg:shrink-0 xl:max-w-2xl">
                  <h1 className="font-heading text-5xl font-semibold tracking-tight text-pretty text-foreground sm:text-7xl">
                    We’re changing the way people connect
                  </h1>
                  <p className="mt-8 text-lg font-medium text-pretty text-muted-foreground sm:max-w-md sm:text-xl/8 lg:max-w-none">
                    Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure
                    qui lorem cupidatat commodo. Elit sunt amet fugiat veniam
                    occaecat fugiat aliqua. Anim aute id magna aliqua ad ad non
                    deserunt sunt.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <a
                      href="#"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "px-3.5 py-2.5 shadow-xs"
                      )}
                    >
                      Get started
                    </a>
                    <a
                      href="#"
                      className="inline-flex items-center gap-1 text-sm/6 font-semibold text-foreground"
                    >
                      Live demo{" "}
                      <HiArrowLongRight className="size-4" aria-hidden />
                    </a>
                  </div>
                </div>
                <EventsList events={events} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
