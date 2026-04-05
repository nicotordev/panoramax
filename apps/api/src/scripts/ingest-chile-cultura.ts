import "dotenv/config";
import { closeBrightDataClient } from "../lib/brightdata.js";
import { ingestChileCultura } from "../lib/ingestion/sources/chileCultura.js";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const pageArg = process.argv.find((arg) => arg.startsWith("--page="));
const regionArg = process.argv.find((arg) => arg.startsWith("--region="));

const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const page = pageArg ? Number(pageArg.split("=")[1]) : 1;
const region = regionArg ? regionArg.split("=")[1] : undefined;

try {
  const result = await ingestChileCultura({
    region,
    page,
    limit,
    persist: true,
  });

  console.log(
    JSON.stringify(
      {
        source: result.source,
        region: result.region,
        page: result.page,
        count: result.count,
        persisted: result.persisted,
      },
      null,
      2,
    ),
  );
} finally {
  await closeBrightDataClient();
}
