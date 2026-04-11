import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/data/variants.data"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { HiArrowUpRight, HiBookOpen, HiClock, HiUser } from "react-icons/hi2"

// --- Types ---

export type BlogSectionMessages = {
  badge: string
  title: string
  description: string
  viewAll: string
  readArticle: string
  emptyTitle: string
  emptyDescription: string
  browseEvents: string
}

export type BlogPost = {
  id: string
  title: string
  description: string | null
  href: string
  date: string
  datetime: string
  coverImageUrl?: string | null
  authorName?: string | null
}

type BlogSectionProps = {
  messages: BlogSectionMessages
  posts: BlogPost[]
}

// --- Sub-components ---

const EmptyState = ({ messages }: { messages: BlogSectionMessages }) => (
  <Card className="border-border/60 bg-card/80 p-10 text-center shadow-sm backdrop-blur-sm">
    <h3 className="font-heading text-lg font-semibold text-foreground flex items-center justify-center gap-2">
      <HiBookOpen className="size-5 text-primary" />
      {messages.emptyTitle}
    </h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
      {messages.emptyDescription}
    </p>
    <Link
      href="/events"
      className={cn(
        buttonVariants({ size: "default" }),
        "mt-6 inline-flex rounded-full px-6"
      )}
    >
      {messages.browseEvents}
      <HiArrowUpRight className="size-4" />
    </Link>
  </Card>
)

const PostCard = ({
  post,
  isFeatured,
  readMoreText,
}: {
  post: BlogPost
  isFeatured?: boolean
  readMoreText: string
}) => {
  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        isFeatured && "md:col-span-2 lg:flex-row"
      )}
    >
      {/* Image Section */}
      {post.coverImageUrl && (
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isFeatured
              ? "aspect-video lg:aspect-square lg:w-2/5"
              : "aspect-16/10"
          )}
        >
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={
              isFeatured
                ? "(max-width: 1024px) 100vw, 40vw"
                : "(max-width: 768px) 100vw, 33vw"
            }
            unoptimized
          />
        </div>
      )}

      {/* Content Section */}
      <article className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <HiClock className="size-3.5" />
            <time dateTime={post.datetime}>{post.date}</time>
          </span>
          {post.authorName && (
            <span className="flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full bg-border" />
              <HiUser className="size-3.5" />
              {post.authorName}
            </span>
          )}
        </div>

        <h3
          className={cn(
            "mt-4 font-heading font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary",
            isFeatured ? "text-2xl sm:text-3xl" : "line-clamp-2 text-xl"
          )}
        >
          <Link href={post.href}>
            <span className="absolute inset-0" aria-hidden="true" />
            {post.title}
          </Link>
        </h3>

        {post.description && (
          <p
            className={cn(
              "mt-3 text-muted-foreground",
              isFeatured ? "line-clamp-4 text-base" : "line-clamp-3 text-sm"
            )}
          >
            {post.description}
          </p>
        )}

        <div className="mt-auto pt-6">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            <HiBookOpen className="size-4" />
            {readMoreText}
            <HiArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </article>
    </Card>
  )
}

// --- Main Component ---

export default function BlogSection({ messages, posts }: BlogSectionProps) {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-3 rounded-full border-primary/20 bg-primary/10 text-primary"
            >
              {messages.badge}
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {messages.title}
            </h2>
            <p className="mt-3 text-muted-foreground sm:text-lg">
              {messages.description}
            </p>
          </div>
          <Link
            href="/blog"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full bg-background/80 shadow-sm backdrop-blur-sm"
            )}
          >
            {messages.viewAll}
            <HiArrowUpRight className="ml-2 size-4" />
          </Link>
        </div>

        {/* Content */}
        {posts.length === 0 ? (
          <EmptyState messages={messages} />
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                isFeatured={index === 0}
                readMoreText={messages.readArticle}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
