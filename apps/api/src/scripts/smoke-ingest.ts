/**
 * Smoke: ingesta real (Bright Data + HTML de producción). Requiere BRIGHTDATA_API_KEY.
 * Por defecto: pocas URLs, sin escribir en DB, sin forzar LLM salvo que lo pidas.
 *
 * Uso:
 *   pnpm --dir apps/api run smoke:ingest
 *   tsx src/scripts/smoke-ingest.ts --sources=gam,ticketplus --limit=1
 *   tsx src/scripts/smoke-ingest.ts --enrichWithLlm=true
 *   tsx src/scripts/smoke-ingest.ts --require-events
 */
import "dotenv/config";
import { closeBrightDataClient } from "../lib/brightdata.js";
import {
  sourceKeys,
  sourceRegistry,
  type SourceKey,
} from "../lib/ingestion/core/sourceRegistry.js";

const sourcesArg = process.argv.find((arg) => arg.startsWith("--sources="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const pageArg = process.argv.find((arg) => arg.startsWith("--page="));
const persistArg = process.argv.find((arg) => arg.startsWith("--persist="));
const enrichArg = process.argv.find((arg) =>
  arg.startsWith("--enrichWithLlm="),
);
const requireEvents = process.argv.includes("--require-events");

const requestedSources = sourcesArg
  ? sourcesArg
      .split("=")[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is SourceKey =>
        sourceKeys.includes(value as SourceKey),
      )
  : sourceKeys;

if (requestedSources.length === 0) {
  console.error(
    "smoke-ingest: no valid sources (use --sources=gam,chile-cultura,...)",
  );
  process.exit(1);
}

const limit = limitArg ? Number(limitArg.split("=")[1]) : 2;
const page = pageArg ? Number(pageArg.split("=")[1]) : 1;
const persist = persistArg ? persistArg.split("=")[1] === "true" : false;
const enrichWithLlm = enrichArg ? enrichArg.split("=")[1] === "true" : false;

try {
  const results = await Promise.all(
    requestedSources.map(async (source) => {
      try {
        const result = await sourceRegistry[source]({
          page,
          limit,
          persist,
          enrichWithLlm,
        });

        const item = {
          source: result.source,
          count: result.count,
          errors: result.errors.length,
          persisted: result.persisted,
        };

        if (requireEvents && result.count === 0) {
          console.error(`smoke-ingest: ${result.source} returned 0 events`);
        }

        return {
          ok: true as const,
          item,
          zeroEvents: result.count === 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`smoke-ingest: ${source} threw: ${message}`);
        return {
          ok: false as const,
          item: {
            source,
            count: 0,
            errors: -1,
            persisted: false,
          },
          zeroEvents: false,
        };
      }
    }),
  );

  const summary = results.map((r) => r.item);
  const failed =
    results.some((r) => !r.ok) ||
    (requireEvents && results.some((r) => r.zeroEvents));

  console.log(JSON.stringify({ smoke: "ingest", summary }, null, 2));

  if (failed) {
    process.exit(1);
  }
} finally {
  await closeBrightDataClient();
}
