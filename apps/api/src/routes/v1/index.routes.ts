import type { Env, Schema } from "hono";
import { Hono } from "hono";
import blogRoutes from "./blog.routes.js";
import cronRoutes from "./cron.routes.js";
import eventsRoutes from "./events.routes.js";
import healthRoutes from "./health.routes.js";
import sourcesRoutes from "./sources.routes.js";
import tasksRoutes from "./tasks.routes.js";

const v1Routes = new Hono<Env, Schema, "/v1">();

v1Routes.route("/health", healthRoutes);
v1Routes.route("/sources", sourcesRoutes);
v1Routes.route("/tasks", tasksRoutes);
v1Routes.route("/events", eventsRoutes);
v1Routes.route("/blog", blogRoutes);
v1Routes.route("/cron", cronRoutes);

export default v1Routes;
