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

const requestedSources = sourcesArg
  ? sourcesArg
      .split("=")[1]
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is SourceKey =>
        sourceKeys.includes(value as SourceKey),
      )
  : sourceKeys;

const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const page = pageArg ? Number(pageArg.split("=")[1]) : 1;
const persist = persistArg ? persistArg.split("=")[1] !== "false" : true;

try {
  const results = [];

  for (const source of requestedSources) {
    const result = await sourceRegistry[source]({
      page,
      limit,
      persist,
    });

    results.push({
      source: result.source,
      count: result.count,
      processed: result.events.length,
      persisted: result.persisted,
      errors: "errors" in result ? result.errors.length : 0,
    });
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await closeBrightDataClient();
}
