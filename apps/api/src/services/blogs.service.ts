import {
  BlogPostStatus,
  TranslationLocale,
} from "../generated/prisma/enums.js";
import {
  serializeBlogPost,
  type SerializedBlogPost,
} from "../lib/blog/serialize-blog-post.js";
import { prisma } from "../lib/prisma.js";
import type {
  BlogPostLocaleQuery,
  ListBlogPostsQuery,
} from "../lib/validation/blog.schema.js";

function applyBlogLocale(
  post: SerializedBlogPost,
  locale?: TranslationLocale,
): SerializedBlogPost {
  if (!locale) {
    return post;
  }

  const translation = post.translations.find((t) => t.locale === locale);
  if (!translation) {
    return post;
  }

  return {
    ...post,
    title: translation.title ?? post.title,
    excerpt: translation.excerpt ?? post.excerpt,
    body: translation.body ?? post.body,
  };
}

function toPublicShape(post: SerializedBlogPost) {
  const {
    translations: _translations,
    status: _status,
    body: _body,
    ...rest
  } = post;
  return rest;
}

function toDetailShape(post: SerializedBlogPost) {
  const { translations: _translations, status: _status, ...rest } = post;
  return rest;
}

class BlogsService {
  async list(query: ListBlogPostsQuery) {
    const { page, limit, locale } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {
      status: BlogPostStatus.published,
      publishedAt: { lte: now },
    };

    const [rows, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: { translations: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    const items = rows.map((row) => {
      const serialized = serializeBlogPost(row);
      const localized = applyBlogLocale(serialized, locale);
      return toPublicShape(localized);
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getBySlug(slug: string, query: BlogPostLocaleQuery) {
    const { locale } = query;
    const now = new Date();

    const row = await prisma.blogPost.findFirst({
      where: {
        slug,
        status: BlogPostStatus.published,
        publishedAt: { lte: now },
      },
      include: { translations: true },
    });

    if (!row) {
      return null;
    }

    const serialized = serializeBlogPost(row);
    const localized = applyBlogLocale(serialized, locale);
    return toDetailShape(localized);
  }
}

const blogsService = new BlogsService();

export default blogsService;
