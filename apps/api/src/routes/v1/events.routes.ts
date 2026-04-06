import { zValidator } from "@hono/zod-validator";
import type { Env, Schema } from "hono";
import { Hono } from "hono";
import { apiAccess } from "../../constants/api-access.js";
import eventsController from "../../controllers/events.controller.js";
import {
  eventCreateBodySchema,
  eventIdParamSchema,
  eventLocaleQuerySchema,
  eventUpdateBodySchema,
  listEventsQuerySchema,
} from "../../lib/validation/events.schema.js";
import { requireApiKey } from "../../middleware/require-api-key.js";
import { zodValidationHook } from "../../utils/zod-validation-hook.js";

const eventsRoutes = new Hono<Env, Schema, "/events">();

eventsRoutes.get(
  "/",
  zValidator("query", listEventsQuerySchema, zodValidationHook),
  eventsController.list,
);

eventsRoutes.post(
  "/",
  requireApiKey([...apiAccess.eventsWrite]),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  zValidator("json", eventCreateBodySchema, zodValidationHook),
  eventsController.create,
);

eventsRoutes.get(
  "/current-week",
  zValidator("query", listEventsQuerySchema, zodValidationHook),
  eventsController.listCurrentWeekEvents,
);

eventsRoutes.get(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  eventsController.getById,
);

eventsRoutes.patch(
  "/:id",
  requireApiKey([...apiAccess.eventsWrite]),
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  zValidator("json", eventUpdateBodySchema, zodValidationHook),
  eventsController.update,
);

eventsRoutes.delete(
  "/:id",
  requireApiKey([...apiAccess.eventsWrite]),
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  eventsController.remove,
);

export default eventsRoutes;
