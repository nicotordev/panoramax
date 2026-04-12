import "dotenv/config";
import { EventStatus } from "../generated/prisma/enums.js";
import { closeBrightDataClient } from "../lib/brightdata.js";
import {
  backfillEventDescriptionWithLlm,
  type EventWithTiersForBackfill,
} from "../lib/ingestion/pipeline/backfillEventDescription.js";
import { storedDescriptionLooksPolluted } from "../lib/ingestion/pipeline/descriptionPollution.js";
import { prisma } from "../lib/prisma.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readArg(flag: string, fallback?: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) {
    return eq.slice(flag.length + 1) || fallback;
  }
  const ix = process.argv.indexOf(flag);
  if (ix !== -1) {
    return process.argv[ix + 1] ?? fallback;
  }
  return fallback;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyPolluted = process.argv.includes("--only-polluted");
  const limitArg = readArg("--limit");
  const maxBackfills =
    limitArg !== undefined
      ? Math.max(1, parseInt(limitArg, 10) || 1)
      : Number.MAX_SAFE_INTEGER;
  const processAll = limitArg === undefined;
  const batchSize = Math.max(
    10,
    parseInt(readArg("--batch-size", "100") ?? "100", 10) || 100,
  );
  const delayMs = Math.max(
    0,
    parseInt(readArg("--delay-ms", "0") ?? "0", 10) || 0,
  );
  const sourceFilter = readArg("--source");

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.BRIGHTDATA_API_KEY) {
    console.warn(
      "BRIGHTDATA_API_KEY missing: rescrape will fail; backfill falls back to DB-only snippets.",
    );
  }

  const eventWhere = {
    status: { notIn: [EventStatus.draft] },
    ...(sourceFilter ? { source: sourceFilter } : {}),
  };

  console.log(
    `Description LLM backfill: dryRun=${dryRun} onlyPolluted=${onlyPolluted} processAll=${processAll} maxBackfills=${processAll ? "all" : String(maxBackfills)} batchSize=${batchSize} source=${sourceFilter ?? "(any)"} (429/503: retries via OPENAI_MAX_RETRIES / OPENAI_RETRY_BASE_MS)`,
  );

  let ok = 0;
  let failed = 0;
  let updated = 0;
  let skipped = 0;
  let would = 0;
  let scanned = 0;
  let backfills = 0;

  let cursor: { id: string } | undefined;

  while (backfills < maxBackfills) {
    const rows = (await prisma.event.findMany({
      where: eventWhere,
      take: batchSize,
      ...(cursor ? { cursor, skip: 1 } : {}),
      orderBy: { id: "asc" },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    })) as EventWithTiersForBackfill[];

    if (rows.length === 0) {
      break;
    }

    scanned += rows.length;

    for (const event of rows) {
      if (backfills >= maxBackfills) {
        break;
      }
      if (onlyPolluted && !storedDescriptionLooksPolluted(event.description)) {
        continue;
      }

      const result = await backfillEventDescriptionWithLlm(event, { dryRun });
      if (!result.ok) {
        failed++;
        console.warn(`FAIL ${event.slug}: ${result.error}`);
      } else {
        ok++;
        if (result.wouldUpdate && !result.updated) {
          would++;
          console.log(
            `${dryRun ? "DRY " : ""}would update ${event.slug}${result.scrapeFailed ? " (scrape failed, DB snippets)" : ""}`,
          );
        } else if (result.updated) {
          updated++;
          console.log(
            `UPDATED ${event.slug}${result.scrapeFailed ? " (scrape failed)" : ""}`,
          );
        } else {
          skipped++;
          console.log(`skip ${event.slug} (no text changes)`);
        }
      }

      backfills++;
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    if (backfills >= maxBackfills) {
      break;
    }

    cursor = { id: rows[rows.length - 1].id };

    if (rows.length < batchSize) {
      break;
    }
  }

  console.log(
    `Done. scanned=${scanned} backfillCalls=${backfills} ok=${ok} updated=${updated} wouldUpdate=${would} unchanged=${skipped} failed=${failed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await closeBrightDataClient().catch(() => undefined);
  });
