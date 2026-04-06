import type { Event } from "../generated/prisma/client.js";
import algolia from "../lib/algolia.js";
import { prisma } from "../lib/prisma.js";

class CronService {
  /**
   * Synchronize all events with Algolia in batches.
   * Returns true if all batches succeeded, false if any batch fails.
   */
  public async syncEvents(): Promise<boolean> {
    const batchSize = 100;
    let lastId: string | undefined = undefined;

    try {
      while (true) {
        // Use keyset pagination for efficient batching
        const events: Event[] = await prisma.event.findMany({
          where: lastId !== undefined ? { id: { lt: lastId } } : undefined,
          take: batchSize,
          orderBy: {
            id: "desc",
          },
        });

        if (events.length === 0) {
          break;
        }

        await algolia.saveEvents(events);

        // Advance lastId for next batch
        lastId = events[events.length - 1].id;
      }

      return true;
    } catch (error) {
      // Optionally log the error somewhere
      // console.error('Failed to sync events to Algolia:', error);
      return false;
    }
  }
}

const cronService = new CronService();

export default cronService;
