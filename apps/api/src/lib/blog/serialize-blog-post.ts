import type { Prisma } from "../../generated/prisma/client.js";

type BlogPostWithTranslations = Prisma.BlogPostGetPayload<{
  include: { translations: true };
}>;

export function serializeBlogPost(post: BlogPostWithTranslations) {
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    coverImageUrl: post.coverImageUrl,
    coverImageAttribution: post.coverImageAttribution,
    authorName: post.authorName,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    translations: post.translations.map((t) => ({
      locale: t.locale,
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
      autoTranslated: t.autoTranslated,
      sourceLocale: t.sourceLocale,
      provider: t.provider,
      version: t.version,
      updatedAt: t.updatedAt.toISOString(),
    })),
  };
}

export type SerializedBlogPost = ReturnType<typeof serializeBlogPost>;
