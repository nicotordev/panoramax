/**
 * Backfill latitude/longitude for in-person events that have location text
 * but no coordinates yet. Uses Nominatim — run sparingly and respect rate limits.
 *
 * Groups events by normalized location key so duplicate venues share one geocode run.
 * HTTP to Nominatim stays ~1 req/s (serialized + spaced in `rateLimitedNominatimFetch`);
 * DB updates run in parallel (`--workers`).
 *
 * Usage:
 *   pnpm --dir apps/api geocode:missing-coordinates
 *   pnpm --dir apps/api tsx src/scripts/geocode-missing-coordinates.ts --dry-run
 *   pnpm --dir apps/api tsx src/scripts/geocode-missing-coordinates.ts --limit=50
 *   pnpm --dir apps/api tsx src/scripts/geocode-missing-coordinates.ts --verbose
 *   pnpm --dir apps/api tsx src/scripts/geocode-missing-coordinates.ts --workers=24
 *   pnpm --dir apps/api tsx src/scripts/geocode-missing-coordinates.ts --llm-fallback
 *   (requires OPENAI_API_KEY; optional OPENAI_GEOCODE_MODEL, defaults to gpt-4o-mini)
 */

import "dotenv/config";
import pLimit from "p-limit";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { normalizeLocationWithLlm } from "../lib/geocoding/address-normalize-llm.js";
import {
  geocodeCacheKey,
  geocodeEventBestEffort,
  normalizeEventForGeocode,
  type GeocodeEventInput,
} from "../lib/geocoding/nominatim.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/panoramax?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type EventRow = Awaited<ReturnType<typeof prisma.event.findMany>>[number];

function toGeocodeInput(event: EventRow): GeocodeEventInput {
  return {
    isOnline: event.isOnline,
    venueName: event.venueName,
    address: event.address,
    commune: event.commune,
    city: event.city,
    country: event.country,
  };
}

function parseWorkers(): number {
  const arg = process.argv.find((a) => a.startsWith("--workers="));
  const n = arg ? Number.parseInt(arg.split("=")[1] ?? "", 10) : 16;
  return Number.isFinite(n) && n >= 1 && n <= 64 ? n : 16;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");
  const llmFallback = process.argv.includes("--llm-fallback");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;
  const dbConcurrency = parseWorkers();
  const dbLimit = pLimit(dbConcurrency);

  if (llmFallback && !process.env.OPENAI_API_KEY?.trim()) {
    console.error("--llm-fallback requires OPENAI_API_KEY in the environment.");
    process.exitCode = 1;
    return;
  }

  const events = await prisma.event.findMany({
    where: {
      isOnline: false,
      latitude: null,
      longitude: null,
    },
    orderBy: { startAt: "asc" },
    ...(Number.isFinite(limit) && limit! > 0 ? { take: limit } : {}),
  });

  const groups = new Map<string, EventRow[]>();
  let skipped = 0;

  for (const event of events) {
    const input = toGeocodeInput(event);
    const key = geocodeCacheKey(input);
    if (!key) {
      skipped++;
      continue;
    }
    const list = groups.get(key);
    if (list) {
      list.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  const unique = groups.size;
  console.log(
    `Found ${events.length} in-person events without coordinates → ${unique} unique location key(s)${dryRun ? " (dry run)" : ""}.`,
  );
  if (!dryRun && unique < events.length) {
    console.log(`DB update concurrency: ${dbConcurrency} (--workers=)`);
  }
  if (llmFallback && !dryRun) {
    console.log(
      "LLM fallback enabled: after Nominatim fails, one OpenAI normalize + retry (set OPENAI_GEOCODE_MODEL to override model).",
    );
  }

  let ok = 0;
  let failed = 0;

  for (const [key, group] of groups) {
    const sample = normalizeEventForGeocode(toGeocodeInput(group[0]!));
    const label = `${group.length}× ${key.slice(0, 88)}${key.length > 88 ? "…" : ""}`;
    console.log(`→ ${label}`);

    if (dryRun) {
      continue;
    }

    let coords = await geocodeEventBestEffort(sample, {
      onAttempt: verbose ? (log) => console.log(`    ${log.label}`) : undefined,
    });

    if (!coords && llmFallback) {
      if (verbose) {
        console.log("    LLM normalize (fallback)…");
      }
      const llmEvent = await normalizeLocationWithLlm(sample);
      if (llmEvent) {
        const afterLlm = normalizeEventForGeocode(llmEvent);
        if (verbose) {
          const preview = afterLlm.venueName.slice(0, 80);
          console.log(
            `    → ${preview}${afterLlm.venueName.length > 80 ? "…" : ""}`,
          );
        }
        coords = await geocodeEventBestEffort(afterLlm, {
          onAttempt: verbose
            ? (log) => console.log(`    [llm] ${log.label}`)
            : undefined,
        });
      }
    }

    if (!coords) {
      console.warn(`  No result (${group.length} events)`);
      failed += group.length;
      continue;
    }

    await Promise.all(
      group.map((e) =>
        dbLimit(() =>
          prisma.event.update({
            where: { id: e.id },
            data: {
              latitude: coords.lat.toFixed(7),
              longitude: coords.lon.toFixed(7),
            },
          }),
        ),
      ),
    );

    console.log(`  ${coords.lat}, ${coords.lon}`);
    ok += group.length;
  }

  console.log(
    dryRun
      ? "Dry run finished (no DB updates)."
      : `Done. Updated: ${ok}, skipped (no query): ${skipped}, no result (events): ${failed}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
