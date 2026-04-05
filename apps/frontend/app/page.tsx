import HeroSection from "@/components/home/hero-section"
import serverClient from "@/lib/server.client"

export default async function Page() {
  const { data: events } = await serverClient.getEvents()
  return (
    <main className="flex min-h-svh p-6">
      <HeroSection events={events} />
    </main>
  )
}
