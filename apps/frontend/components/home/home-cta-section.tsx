import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image";
import { HiArrowLongRight, HiArrowUpRight } from "react-icons/hi2"

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
    <div className="relative flex items-stretch justify-center bg-primary">
      <div className="relative flex w-full">
        {/* Content (left) */}
        <div className="py-24 sm:py-32 lg:py-40 lg:px-8 relative z-10 flex flex-1 flex-col justify-center pr-0 pl-0 md:pr-6 md:pl-16 lg:pl-24 xl:pl-32">
          <h2 className="font-heading text-base/7 font-semibold tracking-tight text-primary">
            {messages.badge}
          </h2>
          <p className="mt-2 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {messages.title}
          </p>
          <p className="mt-6 text-base text-muted-foreground">
            {messages.description}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href={primaryHref}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
              )}
            >
              {messages.primaryCta}
              <HiArrowUpRight className="size-5" aria-hidden />
            </Link>
            <Link
              href={secondaryHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
              )}
            >
              {messages.secondaryCta}
              <HiArrowLongRight className="ml-2 size-5" aria-hidden />
            </Link>
          </div>
        </div>
        {/* Decoration SVG (middle/behind image) */}
        <div className="absolute right-1/2 left-0 z-0 hidden h-80 md:right-auto md:left-auto md:block md:h-full md:w-1/3 lg:w-1/2">
          <svg
            viewBox="0 0 926 676"
            aria-hidden="true"
            className="absolute -bottom-24 left-24 w-[58rem] transform-gpu blur-[118px]"
          >
            <path
              d="m254.325 516.708-90.89 158.331L0 436.427l254.325 80.281 163.691-285.15c1.048 131.759 36.144 345.144 168.149 144.613C751.171 125.508 707.17-93.823 826.603 41.15c95.546 107.978 104.766 294.048 97.432 373.585L685.481 297.694l16.974 360.474-448.13-141.46Z"
              fill="url(#cta-section-gradient)"
              fillOpacity=".4"
            />
            <defs>
              <linearGradient
                id="cta-section-gradient"
                x1="926.392"
                x2="-109.635"
                y1=".176"
                y2="321.024"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="var(--primary)" />
                <stop offset={1} stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        {/* IMAGE RIGHT */}
        <div className="relative hidden flex-1 md:block min-h-80">
          <Image
            alt="Party"
            src="/assets/img/party/pexels-patofuente-20040594.webp"
            className="absolute inset-0 h-full w-full object-cover"
            sizes="100vw"
            fill
            priority
          />
        </div>
      </div>
    </div>
  )
}
