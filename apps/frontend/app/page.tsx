import HeroSection from "@/components/home/hero-section"
import serverClient from "@/lib/server.client"

export default async function Page() {
  const { data: events, meta } = await serverClient.getEvents({ limit: 4 })
  return (
    <main>
      <HeroSection events={events} eventsMeta={meta} />
    </main>
  )
}
