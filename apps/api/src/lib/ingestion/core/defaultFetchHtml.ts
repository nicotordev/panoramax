/** Lazy Bright Data HTML fetch when ingest runs without an injected `fetchHtml`. */
export async function defaultBrightDataFetchHtml(url: string): Promise<string> {
  const { scrapeHtml } = await import("../../brightdata.js");
  return scrapeHtml(url);
}
