import type { EventModel } from "../../generated/prisma/models/Event.js";

export function serializeEvent(event: EventModel) {
  return {
    ...event,
    latitude: event.latitude != null ? String(event.latitude) : null,
    longitude: event.longitude != null ? String(event.longitude) : null,
    priceMin: event.priceMin != null ? String(event.priceMin) : null,
    priceMax: event.priceMax != null ? String(event.priceMax) : null,
  };
}
