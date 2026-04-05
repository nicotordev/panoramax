import { zValidator } from "@hono/zod-validator";
import type { Env, Schema } from "hono";
import { Hono } from "hono";
import eventsController from "../../controllers/events.controller.js";
import {
  eventCreateBodySchema,
  eventIdParamSchema,
  eventUpdateBodySchema,
  listEventsQuerySchema,
} from "../../lib/validation/events.schema.js";
import { zodValidationHook } from "../../utils/zod-validation-hook.js";

const eventsRoutes = new Hono<Env, Schema, "/events">();

eventsRoutes.get(
  "/",
  zValidator("query", listEventsQuerySchema, zodValidationHook),
  eventsController.list,
);

eventsRoutes.post(
  "/",
  zValidator("json", eventCreateBodySchema, zodValidationHook),
  eventsController.create,
);

eventsRoutes.get(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  eventsController.getById,
);

eventsRoutes.patch(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("json", eventUpdateBodySchema, zodValidationHook),
  eventsController.update,
);

eventsRoutes.delete(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  eventsController.remove,
);

export default eventsRoutes;
