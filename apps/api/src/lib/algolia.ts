import { algoliasearch } from "algoliasearch";
import type { Event } from "../generated/prisma/client.js";

const EVENTS_INDEX_NAME = process.env.EVENTS_INDEX_NAME ?? "events_index";

class Algolia {
  private client: ReturnType<typeof algoliasearch>;

  constructor() {
    this.client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_API_KEY!,
    );
  }

  public async saveEvents(events: Event[]) {
    if (events.length === 0) {
      return;
    }

    return await this.client.saveObjects({
      indexName: EVENTS_INDEX_NAME,
      objects: events.map((event) => ({
        ...event,
        objectID: String(event.id),
        latitude: event.latitude != null ? String(event.latitude) : null,
        longitude: event.longitude != null ? String(event.longitude) : null,
        priceMin: event.priceMin != null ? String(event.priceMin) : null,
        priceMax: event.priceMax != null ? String(event.priceMax) : null,
      })),
    });
  }
}

const algolia = new Algolia();

export default algolia;
