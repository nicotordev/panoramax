import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";
import taskMonitorService from "./task-monitor.service.js";

/** HTTP source endpoints always persist scraped events (same policy as ingest scripts). */
const PERSIST = true as const;
const INGEST_ALL_PAGES_TASK_TYPE = "sources:ingest-all-pages";
const TASK_HEARTBEAT_INTERVAL_MS = 60_000;

export type IngestAllPagesInput = {
  sources?: SourceKey[];
  fromPage?: number;
  toPage?: number;
  maxPages?: number;
  limit?: number;
  stopOnEmpty?: boolean;
  enrichWithLlm?: boolean;
  concurrency?: number;
};

export const DEFAULT_INGEST_ALL_PAGES_INPUT: Required<
  Pick<IngestAllPagesInput, "sources" | "fromPage" | "concurrency">
> = {
  sources: sourceKeys,
  fromPage: 1,
  concurrency: 10,
};

export type IngestAllPagesSummary = {
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

  public async ingestAllPages(
    input: IngestAllPagesInput = {},
    options?: {
      onProgress?: (summaries: IngestAllPagesSummary[]) => Promise<void> | void;
    },
  ) {
    const {
      sources = sourceKeys,
      fromPage = 1,
      toPage,
      maxPages,
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

        await options?.onProgress?.([...summaries]);

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

  public async getIngestAllPagesStatus(taskId?: string) {
    if (taskId) {
      return await taskMonitorService.getTask<
        IngestAllPagesInput,
        IngestAllPagesSummary[]
      >(taskId);
    }

    const [activeTask] = await taskMonitorService.listTasks<
      IngestAllPagesInput,
      IngestAllPagesSummary[]
    >(1, INGEST_ALL_PAGES_TASK_TYPE);

    return activeTask ?? null;
  }

  public async listIngestAllPagesTasks(limit = 20) {
    return await taskMonitorService.listTasks<
      IngestAllPagesInput,
      IngestAllPagesSummary[]
    >(limit, INGEST_ALL_PAGES_TASK_TYPE);
  }

  public async startIngestAllPages(input: IngestAllPagesInput = {}) {
    const startedTask = await taskMonitorService.startExclusiveTask<
      IngestAllPagesInput,
      IngestAllPagesSummary[]
    >(INGEST_ALL_PAGES_TASK_TYPE, input);

    if (!startedTask.started) {
      return {
        started: false as const,
        task: startedTask.task,
      };
    }

    const task = startedTask.task;
    let latestSummaries: IngestAllPagesSummary[] = [];
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

    const jobPromise = taskMonitorService
      .markRunning<IngestAllPagesInput, IngestAllPagesSummary[]>(task.id)
      .then(() => {
        heartbeatTimer = setInterval(() => {
          void taskMonitorService
            .markHeartbeat(task.id, [...latestSummaries])
            .catch(() => undefined);
        }, TASK_HEARTBEAT_INTERVAL_MS);

        heartbeatTimer.unref?.();

        return this.ingestAllPages(input, {
          onProgress: async (summaries) => {
            latestSummaries = [...summaries];
            await taskMonitorService.markHeartbeat(task.id, summaries);
          },
        });
      })
      .then(async (summaries) => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        await taskMonitorService.markSucceeded(task.id, summaries);
        return summaries;
      })
      .catch(async (error: unknown) => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        await taskMonitorService.markFailed(
          task.id,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      });

    void jobPromise.catch(() => undefined);

    return {
      started: true as const,
      task,
    };
  }
}

const sourcesService = new SourcesService();

export default sourcesService;
