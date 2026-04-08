import { zValidator } from "@hono/zod-validator";
import type { Env, Schema } from "hono";
import { Hono } from "hono";
import blogsController from "../../controllers/blogs.controller.js";
import {
  blogPostLocaleQuerySchema,
  blogPostSlugParamSchema,
  listBlogPostsQuerySchema,
} from "../../lib/validation/blog.schema.js";
import { zodValidationHook } from "../../utils/zod-validation-hook.js";

const blogRoutes = new Hono<Env, Schema, "/blog">();

blogRoutes.get(
  "/posts",
  zValidator("query", listBlogPostsQuerySchema, zodValidationHook),
  blogsController.list,
);

blogRoutes.get(
  "/posts/:slug",
  zValidator("param", blogPostSlugParamSchema, zodValidationHook),
  zValidator("query", blogPostLocaleQuerySchema, zodValidationHook),
  blogsController.getBySlug,
);

export default blogRoutes;
