import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";

/** HTTP source endpoints always persist scraped events (same policy as ingest scripts). */
const PERSIST = true as const;

class SourcesService {
  public async getSources() {
    return sourceKeys;
  }

  public async getSourceEvents(
    sourceKey: SourceKey,
    region: string | undefined,
    page: number,
    limit: number | undefined,
  ) {
    return await sourceRegistry[sourceKey]({
      page,
      limit,
      persist: PERSIST,
      region,
    });
  }

  public async getAllSourcesEvents(page: number, limit: number) {
    const results = await Promise.all(
      sourceKeys.map(async (sourceKey) => {
        const result = await sourceRegistry[sourceKey]({
          page,
          limit,
          persist: PERSIST,
        });
        return result.events;
      }),
    );

    return results.flat();
  }
}

const sourcesService = new SourcesService();

export default sourcesService;
