import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type {
  EventCreateInput,
  EventLocaleQuery,
  EventUpdateInput,
} from "../../lib/validation/events.schema.js";
import eventsService from "../../services/events.service.js";
import { validJson, validParam, validQuery } from "../../utils/hono-valid.js";
import responseEnhancer from "../../utils/response-enhancer.js";

class AdminEventsController {
  public create = async (c: Context) => {
    try {
      const { locale } = validQuery<EventLocaleQuery>(c);
      const json = validJson<EventCreateInput>(c);
      const event = await eventsService.create(json, locale);
      const body = responseEnhancer.created(
        event,
        "Event created successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to create event",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

  public update = async (c: Context) => {
    try {
      const { locale } = validQuery<EventLocaleQuery>(c);
      const { id } = validParam<{ id: string }>(c);
      const json = validJson<EventUpdateInput>(c);
      const event = await eventsService.update(id, json, locale);
      const body = responseEnhancer.ok(event, "Event updated successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to update event",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

  public remove = async (c: Context) => {
    try {
      const { id } = validParam<{ id: string }>(c);
      await eventsService.delete(id);
      const body = responseEnhancer.ok(
        { id, deleted: true },
        "Event deleted successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to delete event",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };
}

export default new AdminEventsController();
