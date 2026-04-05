import type { Env, Schema } from "hono";
import { Hono } from "hono";
import healthRoutes from "./health.routes.js";
import sourcesRoutes from "./sources.routes.js";

const v1Routes = new Hono<Env, Schema, "/v1">();

v1Routes.route("/health", healthRoutes);
v1Routes.route("/sources", sourcesRoutes);

export default v1Routes;
