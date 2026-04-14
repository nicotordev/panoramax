import type { AuthObject } from "@clerk/backend";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import adminEventsController from "../../../controllers/admin/admin-events.routes.js";
import eventsController from "../../../controllers/events.controller.js";
import {
  eventCreateBodySchema,
  eventIdParamSchema,
  eventLocaleQuerySchema,
  eventSlugParamSchema,
  eventUpdateBodySchema,
  listEventsQuerySchema,
} from "../../../lib/validation/events.schema.js";
import { requireAdminClerkAuth } from "../../../middleware/require-clerk.js";
import { zodValidationHook } from "../../../utils/zod-validation-hook.js";

const adminEventsRoutes = new Hono<{ Variables: { clerkAuth: AuthObject } }>();

adminEventsRoutes.use("*", requireAdminClerkAuth());

adminEventsRoutes.get(
  "/",
  zValidator("query", listEventsQuerySchema, zodValidationHook),
  eventsController.list,
);

adminEventsRoutes.get(
  "/current-week",
  zValidator("query", listEventsQuerySchema, zodValidationHook),
  eventsController.listCurrentWeekEvents,
);

adminEventsRoutes.get(
  "/slug/:slug",
  zValidator("param", eventSlugParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  eventsController.getBySlug,
);

adminEventsRoutes.get(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  eventsController.getById,
);

adminEventsRoutes.post(
  "/",
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  zValidator("json", eventCreateBodySchema, zodValidationHook),
  adminEventsController.create,
);

adminEventsRoutes.patch(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  zValidator("json", eventUpdateBodySchema, zodValidationHook),
  adminEventsController.update,
);

adminEventsRoutes.delete(
  "/:id",
  zValidator("param", eventIdParamSchema, zodValidationHook),
  zValidator("query", eventLocaleQuerySchema, zodValidationHook),
  adminEventsController.remove,
);

export default adminEventsRoutes;
