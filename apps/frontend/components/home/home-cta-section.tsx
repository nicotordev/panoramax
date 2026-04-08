import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export type HomeCtaMessages = {
  title: string
  description: string
  primaryCta: string
  secondaryCta: string
}

type HomeCtaSectionProps = {
  messages: HomeCtaMessages
  primaryHref?: string
  secondaryHref?: string
}

export default function HomeCtaSection({
  messages,
  primaryHref = "/events",
  secondaryHref = "/blog",
}: HomeCtaSectionProps) {
  return (
    <section
      className="relative isolate bg-transparent"
      aria-labelledby="home-cta-heading"
    >
      <div className="px-6 py-16 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="home-cta-heading"
            className="font-heading text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
          >
            {messages.title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-muted-foreground">
            {messages.description}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <Link
              href={primaryHref}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-md px-5 shadow-xs"
              )}
            >
              {messages.primaryCta}
            </Link>
            <Link
              href={secondaryHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-auto px-0 text-base font-semibold text-foreground hover:bg-transparent hover:text-muted-foreground"
              )}
            >
              {messages.secondaryCta}{" "}
              <span aria-hidden="true" className="inline-block">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
      <svg
        viewBox="0 0 1024 1024"
        aria-hidden
        focusable="false"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[min(64rem,180vw)] -translate-x-1/2 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
      >
        <circle
          r={512}
          cx={512}
          cy={512}
          fill="url(#home-cta-radial-glow)"
          fillOpacity={0.5}
        />
        <defs>
          <radialGradient id="home-cta-radial-glow">
            <stop stopColor="var(--cta-glow-inner)" />
            <stop offset={1} stopColor="var(--cta-glow-outer)" />
          </radialGradient>
        </defs>
      </svg>
    </section>
  )
}
