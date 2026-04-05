import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import responseEnhancer from "./response-enhancer.js";

/**
 * Returns API-shaped JSON for Zod failures when used with `zValidator(..., hook)`.
 */
export function zodValidationHook(
  result: { success: true } | { success: false; error: unknown },
  c: Context,
): Response | void {
  if (!result.success) {
    const body = responseEnhancer.errorHandler(result.error);
    return c.json(body, body.status as ContentfulStatusCode);
  }
}
