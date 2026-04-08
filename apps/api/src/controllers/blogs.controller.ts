import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type {
  BlogPostLocaleQuery,
  ListBlogPostsQuery,
} from "../lib/validation/blog.schema.js";
import blogsService from "../services/blogs.service.js";
import { validParam, validQuery } from "../utils/hono-valid.js";
import responseEnhancer from "../utils/response-enhancer.js";

class BlogsController {
  public list = async (c: Context) => {
    try {
      const query = validQuery<ListBlogPostsQuery>(c);
      const result = await blogsService.list(query);
      const body = responseEnhancer.ok(
        result,
        "Blog posts listed successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to list blog posts",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

  public getBySlug = async (c: Context) => {
    try {
      const { slug } = validParam<{ slug: string }>(c);
      const query = validQuery<BlogPostLocaleQuery>(c);
      const post = await blogsService.getBySlug(slug, query);
      if (!post) {
        throw new HTTPException(404, { message: "Blog post not found" });
      }
      const body = responseEnhancer.ok(post, "Blog post fetched successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to fetch blog post",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };
}

const blogsController = new BlogsController();

export default blogsController;
