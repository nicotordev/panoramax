import BlogSection from "@/components/home/blog-section"
import EventCategoryPicker from "@/components/home/event-category-picker"
import EventsBentoGrid from "@/components/home/events-bento-grid"
import HeroSection from "@/components/home/hero-section"
import HomeCtaSection from "@/components/home/home-cta-section"
import PanoramaxFeatures from "@/components/home/panoramax-features"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import serverClient from "@/lib/server.client"
import { getTranslations, setRequestLocale } from "next-intl/server"

type HomePageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const homeT = await getTranslations("HomePage")
  const featuresT = await getTranslations("HomePage.features")
  const blogT = await getTranslations("HomePage.blog")
  const ctaT = await getTranslations("HomePage.cta")

  const dateLocale =
    locale === "es-419" ? "es-419" : locale === "zh-CN" ? "zh-CN" : locale
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
  })

  const [weeklyEventsResponse, heroResponse, randomEventsResponse, blogPosts] =
    await Promise.all([
      serverClient.getCurrentWeekEvents({
        limit: 4,
      }),
      serverClient.getEvents({
        limit: 5,
      }),
      serverClient.getEvents({
        limit: 5,
      }),
      serverClient.getBlogPosts({
        limit: 6,
        locale: nextLocaleToApiLocale(locale),
      }),
    ])

  const blogCards = blogPosts.data.map((post) => {
    const instant = post.publishedAt ?? post.updatedAt
    return {
      id: post.id,
      title: post.title,
      description: post.excerpt ?? null,
      href: `/blog/${post.slug}`,
      date: dateFormatter.format(new Date(instant)),
      datetime: instant,
      coverImageUrl: post.coverImageUrl,
      authorName: post.authorName,
    }
  })

  return (
    <main className="bg-background">
      <HeroSection events={heroResponse.data} eventsMeta={heroResponse.meta} />
      <EventCategoryPicker allEvents={randomEventsResponse.data} />
      <EventsBentoGrid events={weeklyEventsResponse.data} />
      <PanoramaxFeatures
        messages={{
          badge: featuresT("badge"),
          title: featuresT("title"),
          description: featuresT("description"),
          viewEvents: homeT("viewEvents"),
          curatedAgendaTitle: featuresT("curatedAgendaTitle"),
          curatedAgendaDescription: featuresT("curatedAgendaDescription"),
          quickSearchTitle: featuresT("quickSearchTitle"),
          quickSearchDescription: featuresT("quickSearchDescription"),
          localContextTitle: featuresT("localContextTitle"),
          localContextDescription: featuresT("localContextDescription"),
        }}
      />
      <BlogSection
        messages={{
          badge: blogT("badge"),
          title: blogT("title"),
          description: blogT("description"),
          viewAll: blogT("viewAll"),
          readArticle: blogT("readArticle"),
          emptyTitle: blogT("emptyTitle"),
          emptyDescription: blogT("emptyDescription"),
          browseEvents: blogT("browseEvents"),
        }}
        posts={blogCards}
      />
      <HomeCtaSection
        messages={{
          title: ctaT("title"),
          description: ctaT("description"),
          primaryCta: ctaT("primaryCta"),
          secondaryCta: ctaT("secondaryCta"),
        }}
      />
    </main>
  )
}
