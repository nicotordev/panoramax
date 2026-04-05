import type { Context } from "hono";

/** Bridges `zValidator` output to controllers typed as plain `Context`. */
export function validQuery<T>(c: Context): T {
  return (c.req as { valid: (target: "query") => T }).valid("query");
}

export function validParam<T>(c: Context): T {
  return (c.req as { valid: (target: "param") => T }).valid("param");
}

export function validJson<T>(c: Context): T {
  return (c.req as { valid: (target: "json") => T }).valid("json");
}
