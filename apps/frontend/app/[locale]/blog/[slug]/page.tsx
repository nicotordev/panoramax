import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import { createDateFormatter } from "@/lib/date-format"
import serverClient from "@/lib/server.client"
import { cn } from "@/lib/utils"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import { notFound } from "next/navigation"
import { HiArrowLeft, HiClock, HiUser } from "react-icons/hi2"

type BlogArticlePageProps = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: BlogArticlePageProps) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: "BlogPage" })
  const post = await serverClient.getBlogPostBySlug(slug, {
    locale: nextLocaleToApiLocale(locale),
  })
  if (!post) {
    return { title: t("articleNotFoundTitle") }
  }
  return {
    title: `${post.title} · Panoramax`,
    description: post.excerpt ?? undefined,
  }
}

export default async function BlogArticlePage({
  params,
}: BlogArticlePageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations("BlogPage")

  const post = await serverClient.getBlogPostBySlug(slug, {
    locale: nextLocaleToApiLocale(locale),
  })

  if (!post) {
    notFound()
  }

  const dateFormatter = createDateFormatter(locale, {
    dateStyle: "long",
  })

  const instant = post.publishedAt ?? post.updatedAt
  const dateLabel = dateFormatter.format(new Date(instant))

  const paragraphs =
    post.body?.trim() !== ""
      ? post.body!.trim().split(/\n\n+/)
      : post.excerpt
        ? [post.excerpt]
        : []

  return (
    <main className="min-h-screen bg-muted/20">
      <article className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <nav className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/blog"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 inline-flex gap-2 text-muted-foreground hover:text-foreground"
            )}
          >
            <HiArrowLeft className="size-4" />
            {t("backToBlog")}
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "inline-flex gap-2 text-muted-foreground hover:text-foreground"
            )}
          >
            {t("backHome")}
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <HiClock className="size-4 shrink-0" />
              <time dateTime={instant}>{dateLabel}</time>
            </span>
            {post.authorName ? (
              <span className="inline-flex items-center gap-1.5">
                <HiUser className="size-4 shrink-0" />
                {post.authorName}
              </span>
            ) : null}
          </div>
        </header>

        {post.coverImageUrl ? (
          <figure className="mb-10 overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm">
            <div className="relative aspect-video w-full">
              <Image
                src={post.coverImageUrl}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
                unoptimized
              />
            </div>
            {post.coverImageAttribution ? (
              <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">
                {t("coverCredit")}: {post.coverImageAttribution}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="space-y-4 text-base leading-7 text-muted-foreground">
          {paragraphs.length > 0 ? (
            paragraphs.map((block, index) => (
              <p key={index} className="whitespace-pre-wrap text-foreground/90">
                {block}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground italic">
              {t("emptyDescription")}
            </p>
          )}
        </div>
      </article>
    </main>
  )
}
