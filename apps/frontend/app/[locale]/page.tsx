import BlogSection from "@/components/home/blog-section"
import EventCategoryPicker from "@/components/home/event-category-picker"
import EventsBentoGrid from "@/components/home/events-bento-grid"
import HeroSection from "@/components/home/hero-section"
import HomeCtaSection from "@/components/home/home-cta-section"
import PanoramaxFeatures from "@/components/home/panoramax-features"
import MainNav from "@/components/layout/main-nav"
import SiteFooter from "@/components/layout/site-footer"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import { createDateFormatter } from "@/lib/date-format"
import { getFeaturedEventsFromAlgolia } from "@/lib/featured-events-algolia.server"
import serverClient from "@/lib/server.client"
import { getTranslations, setRequestLocale } from "next-intl/server"

type HomePageProps = {
  params: Promise<{ locale: string }>
}

export default async function Page({ params }: HomePageProps) {
  const { locale } = await params
  const apiLocale = nextLocaleToApiLocale(locale)
  setRequestLocale(locale)
  const homeT = await getTranslations("HomePage")
  const featuresT = await getTranslations("HomePage.features")
  const blogT = await getTranslations("HomePage.blog")
  const ctaT = await getTranslations("HomePage.cta")

  const dateFormatter = createDateFormatter(locale, {
    dateStyle: "medium",
  })

  const [
    weeklyEventsResponse,
    featuredEvents,
    heroResponse,
    randomEventsResponse,
    blogPosts,
  ] = await Promise.all([
    serverClient.getCurrentWeekEvents({ limit: 8, locale: apiLocale }),
    getFeaturedEventsFromAlgolia(apiLocale, 5),
    serverClient.getEvents({
      limit: 24,
      sortBy: "startAtAsc",
    }),
    serverClient.getEvents({
      limit: 5,
    }),
    serverClient.getBlogPosts({
      limit: 6,
      locale: apiLocale,
    }),
  ])

  const featuredBentoEvents =
    featuredEvents.length > 0
      ? featuredEvents
      : weeklyEventsResponse.data.slice(0, 5)

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
    <main>
      <MainNav />
      <HeroSection events={heroResponse.data} eventsMeta={heroResponse.meta} />
      <EventCategoryPicker allEvents={randomEventsResponse.data} />
      <EventsBentoGrid events={featuredBentoEvents} />
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
          badge: ctaT("badge"),
          title: ctaT("title"),
          description: ctaT("description"),
          primaryCta: ctaT("primaryCta"),
          secondaryCta: ctaT("secondaryCta"),
        }}
        primaryHref="/auth/sign-up"
        secondaryHref="/auth/sign-in"
      />
      <SiteFooter />
    </main>
  )
}
