import { z } from "zod";
import { TranslationLocale } from "../../generated/prisma/enums.js";

export const listBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  locale: z.nativeEnum(TranslationLocale).optional(),
});

export const blogPostLocaleQuerySchema = z.object({
  locale: z.nativeEnum(TranslationLocale).optional(),
});

export const blogPostSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid slug"),
});

export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;
export type BlogPostLocaleQuery = z.infer<typeof blogPostLocaleQuerySchema>;
