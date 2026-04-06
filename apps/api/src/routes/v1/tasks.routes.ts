import type { Env, Schema } from "hono";
import { Hono } from "hono";
import { apiAccess } from "../../constants/api-access.js";
import tasksController from "../../controllers/tasks.controller.js";
import { requireApiKey } from "../../middleware/require-api-key.js";

const tasksRoutes = new Hono<Env, Schema, "/tasks">();

tasksRoutes.get(
  "/",
  requireApiKey([...apiAccess.sourcesIngest]),
  tasksController.listTasks,
);

tasksRoutes.get(
  "/:taskId",
  requireApiKey([...apiAccess.sourcesIngest]),
  tasksController.getTask,
);

export default tasksRoutes;
