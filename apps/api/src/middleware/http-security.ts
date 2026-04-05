import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

/**
 * Parses CORS_ORIGIN: comma-separated list, or "*" for any origin (avoid with credentials).
 * Production requires CORS_ORIGIN when browsers call the API from another origin.
 */
function resolveCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw === "*") {
    return "*";
  }
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }
  return [];
}

export const httpSecurity: MiddlewareHandler[] = [
  secureHeaders({
    // Default "same-origin" blocks cross-origin fetches even when CORS allows the origin.
    crossOriginResourcePolicy: false,
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity:
      process.env.NODE_ENV === "production"
        ? "max-age=63072000; includeSubDomains; preload"
        : false,
  }),
  cors({
    origin: resolveCorsOrigins(),
    allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
    credentials: false,
  }),
];
