import type { Env, Schema } from "hono";
import { Hono } from "hono";
import { apiAccess } from "../../constants/api-access.js";
import cronController from "../../controllers/cron.controller.js";
import { requireApiKey } from "../../middleware/require-api-key.js";

const cronRoutes = new Hono<Env, Schema, "/cron">();

cronRoutes.get(
  "/algolia-sync-events",
  requireApiKey([...apiAccess.eventsAlgoliaSync]),
  cronController.algoliaSyncEvents,
);

export default cronRoutes;
