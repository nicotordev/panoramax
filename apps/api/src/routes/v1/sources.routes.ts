import type { Env, Schema } from "hono";
import { Hono } from "hono";
import sourcesController from "../../controllers/sources.controller.js";

const sourcesRoutes = new Hono<Env, Schema, "/sources">();

sourcesRoutes.get("/", sourcesController.getSources);

sourcesRoutes.get("/:sourceKey/events", sourcesController.getSourceEvents);

export default sourcesRoutes;
