import "dotenv/config";
import { bdclient } from "@brightdata/sdk";

const apiKey = process.env.BRIGHTDATA_API_KEY;

if (!apiKey) {
  throw new Error("Missing BRIGHTDATA_API_KEY in apps/api/.env");
}

const globalForBrightData = globalThis as {
  brightDataClient?: bdclient;
};

const createBrightDataClient = () =>
  new bdclient({
    apiKey,
    autoCreateZones: true,
  });

export const brightDataClient =
  globalForBrightData.brightDataClient ?? createBrightDataClient();

if (process.env.NODE_ENV !== "production") {
  globalForBrightData.brightDataClient = brightDataClient;
}

type ScrapeResponse =
  | string
  | {
      body?: string;
      status_code?: number;
    };

export const scrapeHtml = async (url: string) => {
  const result = (await brightDataClient.scrapeUrl(url, {
    format: "json",
    dataFormat: "html",
    timeout: 30000,
    country: "cl",
  })) as ScrapeResponse;

  if (typeof result === "string") {
    return result;
  }

  if (!result.body) {
    throw new Error(`Bright Data returned an empty body for ${url}`);
  }

  return result.body;
};
