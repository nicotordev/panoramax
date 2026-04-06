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
    }),
    serverClient.getEvents({
      limit: 5,
    }),
  ]);

  return (
    <main>
      <HeroSection events={heroResponse.data} eventsMeta={heroResponse.meta} />
      <EventsBentoGrid events={weeklyEventsResponse.data} />
    </main>
  )
}
