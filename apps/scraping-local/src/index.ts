import "dotenv/config";
import type { AxiosInstance } from "axios";
import {
  sourceRegistry,
  sourceKeys,
  type SourceKey,
} from "../../api/src/lib/ingestion/core/sourceRegistry.js";
import { createPanoramaxApiClient, upsertEventViaApi } from "./panoramaxApi.js";
import { createPlaywrightFetchSession } from "./engine.js";

type SourceSummary = {
  source: string;
  scraped: number;
  errors: number;
  upserted: number;
  failure?: string;
};

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSourceKey(value: string): value is SourceKey {
  return Object.prototype.hasOwnProperty.call(sourceRegistry, value);
}

function parseSourcesFilter(): SourceKey[] | null {
  const raw = argValue("sources");
  if (!raw?.trim()) {
    return null;
  }
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const keys: SourceKey[] = [];
  for (const p of parts) {
    if (!isSourceKey(p)) {
      console.error(
        `Unknown source in --sources: ${p}. Valid: ${sourceKeys.join(", ")}`,
      );
      process.exit(1);
    }
    keys.push(p);
  }
  return keys;
}

function resolveSourceList(
  command: string,
  filter: SourceKey[] | null,
): SourceKey[] {
  if (command === "all") {
    return filter ?? [...sourceKeys];
  }
  if (!isSourceKey(command)) {
    console.error(
      `Unknown source: ${command}. Use one of: ${sourceKeys.join(", ")}, or "all"`,
    );
    process.exit(1);
  }
  if (filter && !filter.includes(command)) {
    console.error(
      `--sources filter excludes "${command}". Adjust --sources or drop the filter.`,
    );
    process.exit(1);
  }
  return [command];
}

async function pushEventsToApi(
  api: AxiosInstance,
  result: { events: { sourceUrl: string }[] },
  label: string,
) {
  for (const event of result.events) {
    const payload = JSON.parse(JSON.stringify(event)) as Record<
      string,
      unknown
    >;
    await upsertEventViaApi(api, payload);
    console.info(`[api] ${label} upserted ${event.sourceUrl}`);
  }
}

function logPassSummary(
  passLabel: string,
  summary: SourceSummary[],
) {
  const totalScraped = summary.reduce((a, r) => a + r.scraped, 0);
  const totalUpserts = summary.reduce((a, r) => a + r.upserted, 0);
  const totalErrors = summary.reduce((a, r) => a + r.errors, 0);
  console.info(
    `[scraping-local] ${passLabel} SUMMARY scraped=${totalScraped} apiUpserts=${totalUpserts} errors=${totalErrors} bySource=${JSON.stringify(summary)} (upserts actualizan filas existentes por source+sourceUrl)`,
  );
}

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.error(`
Usage:
  pnpm --dir apps/scraping-local start <source|all> [options]

  source: ${sourceKeys.join(" | ")} | all

Options:
  --page=1
  --limit=N
  --region=...          (Chile Cultura only, optional)
  --enrich-llm
  --dry-run             (no API writes)
  --sources=a,b         (with "all": subset and order)
  --parallel-sources    (force parallel: one Playwright browser per source)
  --sequential          (with "all": one browser, sources one after another)
  --loop                (repeat forever; use SIGINT to stop)
  --cycle-sleep-ms=N    (pause between full passes; default 300000 when --loop)
  --max-cycles=N        (run N full passes over the source list, then exit)
  --source-delay-ms=N   (sequential mode only: pause between sources; default 0)

  Note: "all" with 2+ sources runs in parallel by default (same as --parallel-sources).
`);
    process.exit(1);
  }

  const page = Number(argValue("page") ?? "1");
  const limit = argValue("limit") ? Number(argValue("limit")) : undefined;
  const region = argValue("region");
  const dryRun = hasFlag("dry-run");
  const enrichWithLlm = hasFlag("enrich-llm");
  const loopForever = hasFlag("loop");
  const maxCyclesRaw = argValue("max-cycles");
  const maxCycles = maxCyclesRaw ? Math.max(1, Number(maxCyclesRaw)) : null;
  const cycleSleepMs = Number(
    argValue("cycle-sleep-ms") ?? (loopForever ? "300000" : "0"),
  );
  const sourceDelayMs = Number(argValue("source-delay-ms") ?? "0");

  const filter = parseSourcesFilter();
  const sources = resolveSourceList(command, filter);

  const sequentialPreferred =
    hasFlag("sequential") || hasFlag("sequential-sources");
  const parallelSources =
    !sequentialPreferred &&
    (hasFlag("parallel-sources") ||
      hasFlag("parallel") ||
      (command === "all" && sources.length > 1));

  let stopRequested = false;
  const onSigint = () => {
    if (stopRequested) {
      process.exit(1);
    }
    stopRequested = true;
    console.info("\n[scraping-local] SIGINT: stopping after current step…");
  };
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigint);

  const api = dryRun ? null : createPanoramaxApiClient();

  const ingestOptionsFor = (key: SourceKey) => ({
    page,
    limit,
    persist: false,
    enrichWithLlm,
    ...(key === "chile-cultura" && region ? { region } : {}),
  });

  const runOneSourceWithSession = async (
    passLabel: string,
    key: SourceKey,
    sessionFetchHtml: (url: string) => Promise<string>,
  ): Promise<SourceSummary> => {
    console.info(
      `[scraping-local] ${passLabel} source=${key} page=${page} limit=${String(limit ?? "default")} dryRun=${dryRun} enrichWithLlm=${enrichWithLlm}`,
    );

    const result = await sourceRegistry[key]({
      ...ingestOptionsFor(key),
      fetchHtml: sessionFetchHtml,
    });

    console.info(
      `[scraping-local] ${key}: scraped ${result.events.length} event(s), errors=${result.errors.length}`,
    );
    if (result.errors.length > 0) {
      console.warn(JSON.stringify(result.errors, null, 2));
    }

    let upserted = 0;
    if (!dryRun) {
      await pushEventsToApi(api!, result, key);
      upserted = result.events.length;
    }

    return {
      source: key,
      scraped: result.events.length,
      errors: result.errors.length,
      upserted,
    };
  };

  const runPassSequential = async (passLabel: string) => {
    const summary: SourceSummary[] = [];
    const session = await createPlaywrightFetchSession();
    try {
      for (const key of sources) {
        if (stopRequested) {
          break;
        }
        summary.push(
          await runOneSourceWithSession(passLabel, key, session.fetchHtml),
        );

        if (
          sourceDelayMs > 0 &&
          sources.indexOf(key) < sources.length - 1 &&
          !stopRequested
        ) {
          await sleep(sourceDelayMs);
        }
      }
    } finally {
      await session.close();
    }

    logPassSummary(passLabel, summary);
  };

  const runPassParallel = async (passLabel: string) => {
    if (stopRequested) {
      return;
    }

    console.info(
      `[scraping-local] ${passLabel} parallel-sources: ${sources.join(", ")} (una sesión Playwright por fuente)`,
    );

    const tasks = sources.map(async (key) => {
      if (stopRequested) {
        return {
          source: key,
          scraped: 0,
          errors: 0,
          upserted: 0,
          failure: "stopped before start",
        } satisfies SourceSummary;
      }

      const session = await createPlaywrightFetchSession();
      try {
        return await runOneSourceWithSession(passLabel, key, session.fetchHtml);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        console.error(`[scraping-local] ${passLabel} [${key}] FAILED: ${message}`);
        return {
          source: key,
          scraped: 0,
          errors: 1,
          upserted: 0,
          failure: message,
        } satisfies SourceSummary;
      } finally {
        await session.close().catch(() => undefined);
      }
    });

    const summary = await Promise.all(tasks);
    logPassSummary(passLabel, summary);
  };

  const runPass = async (passLabel: string) => {
    const useParallel = parallelSources && sources.length > 1;
    if (useParallel) {
      await runPassParallel(passLabel);
    } else {
      if (parallelSources && sources.length === 1) {
        console.info(
          "[scraping-local] parallel mode ignored (only one source); using one session.",
        );
      }
      await runPassSequential(passLabel);
    }
  };

  try {
    if (!loopForever && maxCycles != null) {
      for (let c = 1; c <= maxCycles && !stopRequested; c += 1) {
        await runPass(`cycle ${c}/${maxCycles}`);
        if (c < maxCycles && cycleSleepMs > 0 && !stopRequested) {
          console.info(
            `[scraping-local] sleeping ${cycleSleepMs}ms before next pass…`,
          );
          await sleep(cycleSleepMs);
        }
      }
    } else if (loopForever) {
      let c = 0;
      while (!stopRequested) {
        c += 1;
        await runPass(
          `cycle ${c}${maxCycles != null ? `/${maxCycles}` : " (repeat)"}`,
        );
        if (maxCycles != null && c >= maxCycles) {
          console.info(`[scraping-local] max-cycles=${maxCycles} reached`);
          break;
        }
        if (cycleSleepMs > 0 && !stopRequested) {
          console.info(
            `[scraping-local] sleeping ${cycleSleepMs}ms before next pass…`,
          );
          await sleep(cycleSleepMs);
        }
      }
    } else {
      await runPass("once");
    }

    console.info("[scraping-local] done");
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigint);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
