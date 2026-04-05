import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import sourcesService from "../services/sources.service.js";
import responseEnhancer from "../utils/response-enhancer.js";
import type { SourceKey } from "../lib/ingestion/core/sourceRegistry.js";

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
      const sourceKey = c.req.param("sourceKey") as SourceKey;
      const region = c.req.query("region") ?? undefined;
      const page = Number(c.req.query("page") ?? "1");
      const limit = c.req.query("limit")
        ? Number(c.req.query("limit"))
        : undefined;
      const result = await sourcesService.getSourceEvents(
        sourceKey,
        region,
        page,
        limit,
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
