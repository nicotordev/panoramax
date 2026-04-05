import type { Env, Schema } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import v1Routes from "./routes/v1/index.routes.js";
import responseEnhancer from "./utils/response-enhancer.js";

const app = new Hono<Env, Schema, "/">();

app.route("/v1", v1Routes);

app.onError((err, c) => {
  console.error(err);
  const body = responseEnhancer.errorHandler(err);
  return c.json(body, body.status as ContentfulStatusCode);
});

export default app;
