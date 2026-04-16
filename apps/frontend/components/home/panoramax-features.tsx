import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  HiArrowUpRight,
  HiMagnifyingGlass,
  HiMapPin,
  HiSparkles,
} from "react-icons/hi2"

type PanoramaxFeaturesMessages = {
  badge: string
  title: string
  description: string
  viewEvents: string
  curatedAgendaTitle: string
  curatedAgendaDescription: string
  quickSearchTitle: string
  quickSearchDescription: string
  localContextTitle: string
  localContextDescription: string
}

type PanoramaxFeaturesProps = {
  messages: PanoramaxFeaturesMessages
}

export default function PanoramaxFeatures({
  messages,
}: PanoramaxFeaturesProps) {
  const features = [
    {
      title: messages.curatedAgendaTitle,
      description: messages.curatedAgendaDescription,
      icon: HiSparkles,
    },
    {
      title: messages.quickSearchTitle,
      description: messages.quickSearchDescription,
      icon: HiMagnifyingGlass,
    },
    {
      title: messages.localContextTitle,
      description: messages.localContextDescription,
      icon: HiMapPin,
    },
  ] as const

  return (
    <section className="bg-primary py-16 text-foreground lg:py-20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-3 rounded-full border-primary/20 bg-background/80 dark:bg-foreground text-primary backdrop-blur-sm hover:bg-background/80"
            >
              {messages.badge}
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-background dark:text-foreground sm:text-4xl">
              {messages.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-background dark:text-foreground sm:text-base">
              {messages.description}
            </p>
          </div>

          <Link
            href="/events"
            className={cn(buttonVariants({ size: "lg", variant: "secondary"  }), "rounded-full px-6")}
          >
            {messages.viewEvents}
            <HiArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="border-primary/20 bg-background/80 dark:bg-foreground/80 py-0 backdrop-blur-sm"
              >
                <div className="p-6">
                  <div className="mb-4 inline-flex rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground dark:text-background">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-foreground dark:text-background">
                    {feature.description}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
