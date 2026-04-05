import "dotenv/config";
import { closeBrightDataClient } from "../lib/brightdata.js";
import { sourceRegistry, type SourceKey } from "../lib/ingestion/core/sourceRegistry.js";

const source = process.argv[2] as SourceKey | undefined;

if (!source || !(source in sourceRegistry)) {
  console.error(
    `Usage: tsx src/scripts/ingest-source.ts <${Object.keys(sourceRegistry).join("|")}> [--page=1] [--limit=10] [--persist=false]`,
  );
  process.exit(1);
}

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const pageArg = process.argv.find((arg) => arg.startsWith("--page="));
const persistArg = process.argv.find((arg) => arg.startsWith("--persist="));

const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const page = pageArg ? Number(pageArg.split("=")[1]) : 1;
const persist = persistArg ? persistArg.split("=")[1] !== "false" : true;

try {
  const result = await sourceRegistry[source]({
    page,
    limit,
    persist,
  });

  console.log(
    JSON.stringify(
      {
        source: result.source,
        page,
        count: result.count,
        processed: "processed" in result ? result.processed : result.count,
        persisted: result.persisted,
        errors: "errors" in result ? result.errors.length : 0,
      },
      null,
      2,
    ),
  );
} finally {
  await closeBrightDataClient();
}
