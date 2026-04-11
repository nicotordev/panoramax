import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type {
  EventCreateInput,
  EventLocaleQuery,
  EventUpdateInput,
  ListEventsQuery,
} from "../lib/validation/events.schema.js";
import eventsService from "../services/events.service.js";
import { validJson, validParam, validQuery } from "../utils/hono-valid.js";
import responseEnhancer from "../utils/response-enhancer.js";

class EventsController {
  public list = async (c: Context) => {
    try {
      const query = validQuery<ListEventsQuery>(c);
      const result = await eventsService.list(query);
      const body = responseEnhancer.ok(result, "Events listed successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to list events",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

  public getById = async (c: Context) => {
    try {
      const { id } = validParam<{ id: string }>(c);
      const { locale } = validQuery<EventLocaleQuery>(c);
      const event = await eventsService.getById(id, locale);
      if (!event) {
        throw new HTTPException(404, { message: "Event not found" });
      }
      const body = responseEnhancer.ok(event, "Event fetched successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to fetch event",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

  public getBySlug = async (c: Context) => {
    try {
      const { slug } = validParam<{ slug: string }>(c);
      const { locale } = validQuery<EventLocaleQuery>(c);
      const event = await eventsService.getBySlug(slug, locale);
      if (!event) {
        throw new HTTPException(404, { message: "Event not found" });
      }
      const body = responseEnhancer.ok(event, "Event fetched successfully");
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to fetch event",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };

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

  public listCurrentWeekEvents = async (c: Context) => {
    try {
      const query = validQuery<ListEventsQuery>(c);
      const result = await eventsService.listCurrentWeekEvents(query);
      const body = responseEnhancer.ok(
        result,
        "Current week events listed successfully",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    } catch (error) {
      const body = responseEnhancer.errorHandler(
        error,
        "Failed to list current week events",
      );
      return c.json(body, body.status as ContentfulStatusCode);
    }
  };
}

const eventsController = new EventsController();

export default eventsController;
