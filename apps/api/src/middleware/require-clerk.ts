import type { AuthObject } from "@clerk/backend";
import { createClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import responseEnhancer from "../utils/response-enhancer.js";

/** Browser origins allowed to mint session tokens consumed by the API (Clerk `authorizedParties`). */
const DEFAULT_PRODUCTION_CLERK_PARTIES = [
  "https://panoramax.cl",
  "https://panoramax.nicotordev.com",
] as const;

function resolveClerkAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }
  return [...DEFAULT_PRODUCTION_CLERK_PARTIES];
}

let clerkSingleton: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient(): ReturnType<typeof createClerkClient> | null {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    return null;
  }
  if (!clerkSingleton) {
    clerkSingleton = createClerkClient({ secretKey });
  }
  return clerkSingleton;
}

/**
 * Requires a valid Clerk session (`Authorization: Bearer` session JWT from Clerk, or session cookie when applicable).
 * Set `CLERK_SECRET_KEY`. Optionally set `CLERK_JWT_KEY` for networkless verification and `CLERK_AUTHORIZED_PARTIES`.
 */
export function requireClerkAuth() {
  return createMiddleware<{ Variables: { clerkAuth: AuthObject } }>(
    async (c, next) => {
      const clerk = getClerkClient();
      if (clerk === null) {
        const body = responseEnhancer.errorHandler(
          new HTTPException(503, {
            message:
              "Clerk is not configured on the API (set CLERK_SECRET_KEY).",
          }),
        );
        return c.json(body, 503);
      }

      const jwtKey = process.env.CLERK_JWT_KEY?.trim();
      const state = await clerk.authenticateRequest(c.req.raw, {
        authorizedParties: resolveClerkAuthorizedParties(),
        ...(jwtKey ? { jwtKey } : {}),
      });

      if (!state.isAuthenticated) {
        const body = responseEnhancer.errorHandler(
          new HTTPException(401, {
            message:
              "Valid Clerk session required. Send Authorization: Bearer <token> from Clerk getToken().",
          }),
        );
        return c.json(body, 401);
      }

      c.set("clerkAuth", state.toAuth());
      await next();
    },
  );
}
