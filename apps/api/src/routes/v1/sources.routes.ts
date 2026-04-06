import type { Env, Schema } from "hono";
import { Hono } from "hono";
import { apiAccess } from "../../constants/api-access.js";
import sourcesController from "../../controllers/sources.controller.js";
import { requireApiKey } from "../../middleware/require-api-key.js";

const sourcesRoutes = new Hono<Env, Schema, "/sources">();

sourcesRoutes.get("/", requireApiKey([...apiAccess.sourcesIngest]), sourcesController.getSources);

sourcesRoutes.get("/all", requireApiKey([...apiAccess.sourcesIngest]), sourcesController.getAllSourcesEvents);
sourcesRoutes.get("/ingest-all-pages", requireApiKey([...apiAccess.sourcesIngest]), sourcesController.getIngestAllPagesStatus);
sourcesRoutes.post("/ingest-all-pages", requireApiKey([...apiAccess.sourcesIngest]), sourcesController.ingestAllPages);

sourcesRoutes.get("/:sourceKey/events", requireApiKey([...apiAccess.sourcesIngest]), sourcesController.getSourceEvents);

export default sourcesRoutes;
