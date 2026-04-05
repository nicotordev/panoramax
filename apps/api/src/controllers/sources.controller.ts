import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import sourcesService from "../services/sources.service.js";
import responseEnhancer from "../utils/response-enhancer.js";
import type { SourceKey } from "../lib/ingestion/core/sourceRegistry.js";

const getSourceEventsParamsSchema = z.object({
  sourceKey: z.string(),
  region: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val))
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val))
    .optional(),
});

class SourcesController {
  public async getSources(c: Context) {
    try {
      const sources = await sourcesService.getSources();
      const body = responseEnhancer.ok(sources, "Sources fetched successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to get sources",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }

  public async getSourceEvents(
    c: Context<Env, "/:sourceKey/events", { in: { sourceKey: SourceKey } }>,
  ) {
    try {
      // Parse params and query using zod
      const parse = getSourceEventsParamsSchema.safeParse({
        sourceKey: c.req.param("sourceKey"),
        region: c.req.query("region"),
        page: c.req.query("page"),
        limit: c.req.query("limit"),
      });

      if (!parse.success) {
        const body = responseEnhancer.errorHandler(
          parse.error.issues,
          "Validation failed for source events params",
        );
        return c.json(body, body.status as ContentfulStatusCode);
      }

      const { sourceKey, region, page, limit } = parse.data;
      // If page is not provided, default to 1
      const pageNumber = typeof page === "number" ? page : 1;

      const result = await sourcesService.getSourceEvents(
        sourceKey as SourceKey,
        region,
        pageNumber,
        typeof limit === "number" ? limit : undefined,
      );

      const body = responseEnhancer.ok(
        result,
        "Source events fetched successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to get source events",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }
}

const sourcesController = new SourcesController();

export default sourcesController;
