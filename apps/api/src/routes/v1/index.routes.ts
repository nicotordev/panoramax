import type { Env, Schema } from "hono";
import { Hono } from "hono";
import eventsRoutes from "./events.routes.js";
import healthRoutes from "./health.routes.js";
import sourcesRoutes from "./sources.routes.js";
import tasksRoutes from "./tasks.routes.js";

const v1Routes = new Hono<Env, Schema, "/v1">();

v1Routes.route("/health", healthRoutes);
v1Routes.route("/sources", sourcesRoutes);
v1Routes.route("/tasks", tasksRoutes);
v1Routes.route("/events", eventsRoutes);

export default v1Routes;
