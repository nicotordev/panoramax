import EventsBentoGrid from "@/components/home/events-bento-grid"
import HeroSection from "@/components/home/hero-section"
import serverClient from "@/lib/server.client"
import { setRequestLocale } from "next-intl/server"

type HomePageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const [weeklyEventsResponse, heroResponse] = await Promise.all([
    serverClient.getCurrentWeekEvents({
      limit: 4,
      status: "scheduled",
    }),
    serverClient.getEvents({
      limit: 5,
      status: "scheduled",
    }),
  ]);
  const { data: heroEvents } = heroResponse

  return (
    <main>
      <HeroSection events={weeklyEventsResponse.data} eventsMeta={weeklyEventsResponse.meta} />
      <EventsBentoGrid events={heroEvents} />
    </main>
  )
}
