import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";

/** HTTP source endpoints always persist scraped events (same policy as ingest scripts). */
const PERSIST = true as const;

type IngestAllPagesInput = {
  sources?: SourceKey[];
  fromPage?: number;
  toPage?: number;
  maxPages?: number;
  limit?: number;
  stopOnEmpty?: boolean;
  enrichWithLlm?: boolean;
  concurrency?: number;
};

type IngestAllPagesSummary = {
  source: string;
  page: number;
  count: number;
  processed: number;
  skipped: number;
  persisted: boolean;
  errors: number;
};

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

  public async ingestAllPages(input: IngestAllPagesInput = {}) {
    const {
      sources = sourceKeys,
      fromPage = 1,
      toPage,
      maxPages = 500,
      limit,
      stopOnEmpty = true,
      enrichWithLlm,
      concurrency = 10,
    } = input;

    const pendingSources = [...sources];
    const summaries: IngestAllPagesSummary[] = [];

    const runSource = async (source: SourceKey) => {
      for (let page = fromPage; ; page += 1) {
        if (toPage !== undefined && page > toPage) {
          break;
        }
        if (maxPages !== undefined && page - fromPage >= maxPages) {
          break;
        }

        const result = await sourceRegistry[source]({
          page,
          limit,
          persist: PERSIST,
          enrichWithLlm,
        });

        summaries.push({
          source: result.source,
          page: result.page,
          count: result.count,
          processed: result.processed,
          skipped: result.skipped,
          persisted: result.persisted,
          errors: result.errors.length,
        });

        if (stopOnEmpty && result.processed === 0) {
          break;
        }
      }
    };

    const worker = async () => {
      while (pendingSources.length > 0) {
        const source = pendingSources.shift();
        if (!source) {
          break;
        }
        await runSource(source);
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, pendingSources.length || 1) },
        () => worker(),
      ),
    );

    return summaries;
  }
}

const sourcesService = new SourcesService();

export default sourcesService;
