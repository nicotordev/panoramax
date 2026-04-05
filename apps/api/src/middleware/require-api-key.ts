import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { ApiKeyScope } from "../constants/api-access.js";
import apiKeysService from "../services/api-keys.service.js";
import responseEnhancer from "../utils/response-enhancer.js";

function readApiKeyFromRequest(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey !== null && headerKey.trim() !== "") {
    return headerKey;
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return null;
}

export function requireApiKey(requiredScopes: ApiKeyScope[] = []) {
  return createMiddleware(async (c, next) => {
    const rawApiKey = readApiKeyFromRequest(c.req.raw);

    if (rawApiKey === null) {
      const body = responseEnhancer.errorHandler(
        new HTTPException(401, {
          message: "API key required. Send it with x-api-key or Authorization: Bearer <key>.",
        }),
      );
      return c.json(body, 401);
    }

    const apiKey = await apiKeysService.validate(rawApiKey);
    if (apiKey === null) {
      const body = responseEnhancer.errorHandler(
        new HTTPException(401, { message: "Invalid or inactive API key" }),
      );
      return c.json(body, 401);
    }

    if (!apiKeysService.hasScopes(apiKey, requiredScopes)) {
      const body = responseEnhancer.errorHandler(
        new HTTPException(403, {
          message: `Missing required API key scope(s): ${requiredScopes.join(", ")}`,
        }),
      );
      return c.json(body, 403);
    }

    await next();
  });
}
