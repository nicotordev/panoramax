import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import sourcesService from "../services/sources.service.js";
import responseEnhancer from "../utils/response-enhancer.js";

const listTasksQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value))
    .optional(),
});

const getTaskParamsSchema = z.object({
  taskId: z.uuid(),
});

class TasksController {
  public async listTasks(c: Context) {
    try {
      const parse = listTasksQuerySchema.safeParse({
        limit: c.req.query("limit"),
      });

      if (!parse.success) {
        const body = responseEnhancer.errorHandler(
          parse.error.issues,
          "Validation failed for tasks params",
        );
        return c.json(body, body.status as ContentfulStatusCode);
      }

      const tasks = await sourcesService.listIngestAllPagesTasks(
        parse.data.limit ?? 20,
      );
      const body = responseEnhancer.ok(
        tasks,
        "Tasks fetched successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(error, "Failed to get tasks");
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }

  public async getTask(c: Context) {
    try {
      const parse = getTaskParamsSchema.safeParse({
        taskId: c.req.param("taskId"),
      });

      if (!parse.success) {
        const body = responseEnhancer.errorHandler(
          parse.error.issues,
          "Validation failed for task params",
        );
        return c.json(body, body.status as ContentfulStatusCode);
      }

      const task = await sourcesService.getIngestAllPagesStatus(parse.data.taskId);
      const body = responseEnhancer.ok(task, "Task fetched successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(error, "Failed to get task");
      return c.json(body, body.status as ContentfulStatusCode);
    }
  }
}

const tasksController = new TasksController();

export default tasksController;
