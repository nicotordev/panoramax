import "dotenv/config";
import { closeBrightDataClient } from "../lib/brightdata.js";
import type { IngestionResult } from "../lib/ingestion/core/shared.js";
import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";

const sourcesArg = process.argv.find((arg) => arg.startsWith("--sources="));
const fromPageArg = process.argv.find((arg) => arg.startsWith("--from-page="));
const toPageArg = process.argv.find((arg) => arg.startsWith("--to-page="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const persistArg = process.argv.find((arg) => arg.startsWith("--persist="));
const stopOnEmptyArg = process.argv.find((arg) =>
  arg.startsWith("--stop-on-empty="),
);
const enrichWithLlmArg = process.argv.find((arg) =>
  arg.startsWith("--enrich-with-llm="),
);
const concurrencyArg = process.argv.find((arg) =>
  arg.startsWith("--concurrency="),
);

const requestedSources = sourcesArg
  ? sourcesArg
      .split("=")[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is SourceKey =>
        sourceKeys.includes(value as SourceKey),
      )
  : sourceKeys;

const fromPage = fromPageArg ? Number(fromPageArg.split("=")[1]) : 1;
const toPage = toPageArg ? Number(toPageArg.split("=")[1]) : 10;
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

// ENSURE: persist defaults to true (persist by default, "+" indication), but user can disable with --persist=false
const persist = persistArg ? persistArg.split("=")[1] !== "false" : true;

const stopOnEmpty = stopOnEmptyArg
  ? stopOnEmptyArg.split("=")[1] !== "false"
  : true;
const enrichWithLlm = enrichWithLlmArg
  ? enrichWithLlmArg.split("=")[1] === "true"
  : undefined;
const concurrency = concurrencyArg
  ? Math.max(1, Number(concurrencyArg.split("=")[1]))
  : 3;

type IngestionSummary = {
  source: string;
  page: number;
  count: number;
  processed: number;
  skipped: number;
  persisted: boolean;
  errors: number;
  error?: string;
};

if (
  !Number.isFinite(fromPage) ||
  !Number.isFinite(toPage) ||
  fromPage < 1 ||
  toPage < fromPage ||
  !Number.isFinite(concurrency)
) {
  console.error(
    "Usage: tsx src/scripts/ingest-all-pages.ts [--sources=gam,ticketplus] [--from-page=1] [--to-page=10] [--limit=50] [--persist=false] [--stop-on-empty=true] [--enrich-with-llm=true] [--concurrency=3]\n\nNOTE: --persist now defaults to true (persist by default, +); supply --persist=false to skip persistence."
  );
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStart(source: string, page: number) {
  console.log(
    `[${new Date().toISOString()}] Starting ingest source=${source} page=${page} enrichWithLlm=${String(enrichWithLlm ?? Boolean(process.env.OPENAI_API_KEY))}`,
  );
}

function logResult(source: string, page: number, result: IngestionResult) {
  console.log(
    `[${new Date().toISOString()}] Completed source=${source} page=${page} | processed=${result.processed}, skipped=${result.skipped}, persisted=${result.persisted}, errors=${result.errors.length}`,
  );
}

function logError(source: string, page: number, error: unknown) {
  console.error(
    `[${new Date().toISOString()}] ERROR source=${source} page=${page}:`,
    error,
  );
}

function toSummary(result: IngestionResult): IngestionSummary {
  return {
    source: result.source,
    page: result.page,
    count: result.count,
    processed: result.processed,
    skipped: result.skipped,
    persisted: result.persisted,
    errors: result.errors.length,
  };
}

async function runSource(source: SourceKey): Promise<IngestionSummary[]> {
  const summaries: IngestionSummary[] = [];

  for (let page = fromPage; page <= toPage; page += 1) {
    logStart(source, page);

    try {
      const result = await sourceRegistry[source]({
        page,
        limit,
        persist,
        enrichWithLlm,
      });

      logResult(source, page, result);
      summaries.push(toSummary(result));

      if (stopOnEmpty && result.processed === 0) {
        console.log(
          `[${new Date().toISOString()}] Stopping early for source=${source} due to empty page at page=${page}`,
        );
        break;
      }
    } catch (error) {
      logError(source, page, error);
      summaries.push({
        source,
        page,
        error: error instanceof Error ? error.message : String(error),
        count: 0,
        processed: 0,
        skipped: 0,
        persisted: false,
        errors: 1,
      });
    }

    await sleep(50);
  }

  return summaries;
}

try {
  const pendingSources = [...requestedSources];
  const results: IngestionSummary[] = [];

  async function worker() {
    while (pendingSources.length > 0) {
      const source = pendingSources.shift();
      if (!source) {
        break;
      }

      const summaries = await runSource(source);
      results.push(...summaries);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, pendingSources.length || 1) },
    () => worker(),
  );
  await Promise.all(workers);

  console.log(JSON.stringify(results, null, 2));
} finally {
  await closeBrightDataClient();
}
