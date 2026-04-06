import HeroSection from "@/components/home/hero-section"
import serverClient from "@/lib/server.client"
import { setRequestLocale } from "next-intl/server"

type HomePageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const { data: events, meta } = await serverClient.getEvents({ limit: 4 })

  return (
    <main>
      <HeroSection events={events} eventsMeta={meta} />
    </main>
  )
}
