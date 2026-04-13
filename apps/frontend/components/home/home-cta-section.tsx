import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { HiArrowLongRight } from "react-icons/hi2"

export type HomeCtaMessages = {
  badge: string
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
  primaryHref = "/auth/sign-up",
  secondaryHref = "/auth/sign-in",
}: HomeCtaSectionProps) {
  return (
    <section
      className="relative isolate overflow-hidden bg-background py-24 sm:py-32"
      aria-labelledby="home-cta-heading"
    >
      {/* Elementos de diseño: Glows de fondo usando tus variables OKLCH */}
      <div
        className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[120px]"
        style={{ background: "var(--cta-glow-inner)" }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative mx-auto max-w-2xl text-center">
          {/* Badge sutil superior */}
          <span className="mb-6 inline-block text-sm font-bold tracking-[0.2em] text-primary uppercase">
            {messages.badge}
          </span>

          <h2
            id="home-cta-heading"
            className="font-heading text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
          >
            {messages.title}
          </h2>

          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {messages.description}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-x-8">
            <Link
              href={primaryHref}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "group relative h-14 rounded-full px-8 text-base font-bold transition-all hover:scale-105 hover:shadow-[0_0_30px_var(--cta-glow-inner)]"
              )}
            >
              {messages.primaryCta}
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            </Link>

            <Link
              href={secondaryHref}
              className="group flex items-center gap-2 text-base font-bold text-foreground transition-colors hover:text-primary"
            >
              {messages.secondaryCta}
              <HiArrowLongRight
                className="size-5 transition-transform group-hover:translate-x-2"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Decoración de grid sutil (opcional para textura) */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.03] dark:opacity-[0.05]" />
    </section>
  )
}
