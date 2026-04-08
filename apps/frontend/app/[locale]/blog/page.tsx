import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { nextLocaleToApiLocale } from "@/lib/api-locale"
import serverClient from "@/lib/server.client"
import { cn } from "@/lib/utils"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import { HiArrowLeft, HiArrowUpRight, HiClock } from "react-icons/hi2"

type BlogIndexPageProps = {
  params: Promise<{ locale: string }>
}

export default async function BlogIndexPage({ params }: BlogIndexPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("BlogPage")

  const dateLocale =
    locale === "es-419" ? "es-419" : locale === "zh-CN" ? "zh-CN" : locale
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
    dateStyle: "medium",
  })

  const { data: posts } = await serverClient.getBlogPosts({
    limit: 50,
    locale: nextLocaleToApiLocale(locale),
  })

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-8 -ml-2 inline-flex gap-2 text-muted-foreground hover:text-foreground"
          )}
        >
          <HiArrowLeft className="size-4" />
          {t("backHome")}
        </Link>

        <header className="mb-10">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        {posts.length === 0 ? (
          <Card className="border-border/60 bg-card p-8 text-center shadow-sm">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((post) => {
              const instant = post.publishedAt ?? post.updatedAt
              const dateLabel = dateFormatter.format(new Date(instant))
              return (
                <li key={post.id}>
                  <Card className="overflow-hidden border-border/60 py-0 transition-shadow hover:shadow-md">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col gap-0 sm:flex-row"
                    >
                      {post.coverImageUrl ? (
                        <div className="relative aspect-video w-full shrink-0 bg-muted sm:aspect-auto sm:min-h-[120px] sm:w-44">
                          <Image
                            src={post.coverImageUrl}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 176px"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <HiClock className="size-3.5" />
                          <time dateTime={instant}>{dateLabel}</time>
                        </div>
                        <span className="font-heading text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {post.title}
                        </span>
                        {post.excerpt ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {post.excerpt}
                          </p>
                        ) : null}
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          {t("openNote")}
                          <HiArrowUpRight className="size-4" />
                        </span>
                      </div>
                    </Link>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
