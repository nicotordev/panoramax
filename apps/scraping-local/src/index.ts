import "dotenv/config";
import type { AxiosInstance } from "axios";
import {
  sourceRegistry,
  sourceKeys,
  type SourceKey,
} from "../../api/src/lib/ingestion/core/sourceRegistry.js";
import { createPanoramaxApiClient, upsertEventViaApi } from "./panoramaxApi.js";
import { createPlaywrightFetchSession } from "./engine.js";

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
  --loop                (repeat forever; use SIGINT to stop)
  --cycle-sleep-ms=N    (pause between full passes; default 300000 when --loop)
  --max-cycles=N        (run N full passes over the source list, then exit)
  --source-delay-ms=N   (pause between sources within one pass; default 0)
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

  const session = await createPlaywrightFetchSession();
  const api = dryRun ? null : createPanoramaxApiClient();

  const runPass = async (passLabel: string) => {
    for (const key of sources) {
      if (stopRequested) {
        return;
      }
      console.info(
        `[scraping-local] ${passLabel} source=${key} page=${page} limit=${String(limit ?? "default")} dryRun=${dryRun} enrichWithLlm=${enrichWithLlm}`,
      );

      const result = await sourceRegistry[key]({
        page,
        limit,
        persist: false,
        enrichWithLlm,
        fetchHtml: session.fetchHtml,
        ...(key === "chile-cultura" && region ? { region } : {}),
      });

      console.info(
        `[scraping-local] ${key}: scraped ${result.events.length} event(s), errors=${result.errors.length}`,
      );
      if (result.errors.length > 0) {
        console.warn(JSON.stringify(result.errors, null, 2));
      }

      if (!dryRun) {
        await pushEventsToApi(api!, result, key);
      }

      if (sourceDelayMs > 0 && sources.indexOf(key) < sources.length - 1) {
        await sleep(sourceDelayMs);
      }
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
    await session.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
