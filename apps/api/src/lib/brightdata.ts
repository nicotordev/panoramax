import { bdclient } from "@brightdata/sdk";
import "dotenv/config";

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

export const closeBrightDataClient = async () => {
  await brightDataClient.close();
};

type ScrapeResponse =
  | string
  | {
      body?: string;
      status_code?: number;
    };

function readTimeoutMs(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 5_000 ? n : fallback;
}

const HTML_SCRAPE_TIMEOUT_MS = readTimeoutMs(
  "BRIGHTDATA_SCRAPE_TIMEOUT_MS",
  30_000,
);
const MARKDOWN_SCRAPE_TIMEOUT_MS = readTimeoutMs(
  "BRIGHTDATA_MARKDOWN_TIMEOUT_MS",
  90_000,
);

function unwrapJsonScrapeBody(result: ScrapeResponse, url: string): string {
  if (typeof result === "string") {
    return result;
  }

  if (!result.body) {
    throw new Error(`Bright Data returned an empty body for ${url}`);
  }

  return result.body;
}

export const scrapeHtml = async (url: string) => {
  const result = (await brightDataClient.scrapeUrl(url, {
    format: "json",
    dataFormat: "html",
    timeout: HTML_SCRAPE_TIMEOUT_MS,
    country: "cl",
  })) as ScrapeResponse;

  return unwrapJsonScrapeBody(result, url);
};

/** Web Unlocker markdown extract (structure-preserving; good LLM input). */
export const scrapeMarkdown = async (url: string) => {
  const result = (await brightDataClient.scrapeUrl(url, {
    format: "json",
    dataFormat: "markdown",
    timeout: MARKDOWN_SCRAPE_TIMEOUT_MS,
    country: "cl",
  })) as ScrapeResponse;

  return unwrapJsonScrapeBody(result, url);
};
