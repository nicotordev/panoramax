import "dotenv/config";
import { backfillEventDescriptionWithLlm } from "../lib/ingestion/pipeline/backfillEventDescription.js";
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
  const limit = Math.max(
    1,
    parseInt(readArg("--limit", "50") ?? "50", 10) || 50,
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

  const fetchSize = onlyPolluted ? Math.min(500, limit * 15) : limit;

  const rows = await prisma.event.findMany({
    where: {
      status: { notIn: ["draft"] },
      ...(sourceFilter ? { source: sourceFilter } : {}),
    },
    include: { tiers: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "asc" },
    take: fetchSize,
  });

  const candidates = onlyPolluted
    ? rows.filter((e) => storedDescriptionLooksPolluted(e.description))
    : rows;
  const toRun = candidates.slice(0, limit);

  console.log(
    `Description LLM backfill: dryRun=${dryRun} onlyPolluted=${onlyPolluted} limit=${limit} source=${sourceFilter ?? "(any)"} fetched=${rows.length} selected=${toRun.length}`,
  );

  let ok = 0;
  let failed = 0;
  let updated = 0;
  let skipped = 0;
  let would = 0;

  for (const event of toRun) {
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
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log(
    `Done. ok=${ok} updated=${updated} wouldUpdate=${would} unchanged=${skipped} failed=${failed}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
