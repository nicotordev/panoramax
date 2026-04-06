import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { sourceKeys } from "../lib/ingestion/core/sourceRegistry.js";
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

const getAllSourcesEventsQuerySchema = z.object({
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

const ingestAllPagesBodySchema = z
  .object({
    sources: z.array(z.string()).optional(),
    fromPage: z.number().int().positive().optional(),
    toPage: z.number().int().positive().optional(),
    maxPages: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
    stopOnEmpty: z.boolean().optional(),
    enrichWithLlm: z.boolean().optional(),
    concurrency: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.toPage !== undefined &&
      val.fromPage !== undefined &&
      val.toPage < val.fromPage
    ) {
      ctx.addIssue({
        code: "custom",
        message: "toPage must be greater than or equal to fromPage",
        path: ["toPage"],
      });
    }
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

  public async getAllSourcesEvents(
    c: Context<Env, "/all", { in: { page: number; limit: number } }>,
  ) {
    try {
      // Use zod only for parsing query
      const parse = getAllSourcesEventsQuerySchema.safeParse({
        page: c.req.query("page"),
        limit: c.req.query("limit"),
      });

      if (!parse.success) {
        const body = responseEnhancer.errorHandler(
          parse.error.issues,
          "Validation failed for all sources events params",
        );
        return c.json(body, body.status as ContentfulStatusCode);
      }

      const page = typeof parse.data.page === "number" ? parse.data.page : 1;
      const limit = typeof parse.data.limit === "number" ? parse.data.limit : 100;

      const result = await sourcesService.getAllSourcesEvents(page, limit);
      const body = responseEnhancer.ok(
        result,
        "All sources events fetched successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to get all sources events",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }

  public async ingestAllPages(c: Context) {
    try {
      const rawBody = await c.req.json().catch(() => ({}));
      const parse = ingestAllPagesBodySchema.safeParse(rawBody);

      if (!parse.success) {
        const body = responseEnhancer.errorHandler(
          parse.error.issues,
          "Validation failed for ingest-all-pages payload",
        );
        return c.json(body, body.status as ContentfulStatusCode);
      }

      const requestedSources =
        parse.data.sources?.filter(
          (value): value is SourceKey =>
            sourceKeys.includes(value as SourceKey),
        ) ?? undefined;

      const result = await sourcesService.ingestAllPages({
        sources: requestedSources,
        fromPage: parse.data.fromPage,
        toPage: parse.data.toPage,
        maxPages: parse.data.maxPages,
        limit: parse.data.limit,
        stopOnEmpty: parse.data.stopOnEmpty,
        enrichWithLlm: parse.data.enrichWithLlm,
        concurrency: parse.data.concurrency,
      });

      const body = responseEnhancer.ok(
        result,
        "All-pages ingestion finished successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to ingest all pages",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }
}

const sourcesController = new SourcesController();

export default sourcesController;
