import { defaultBrightDataFetchHtml } from "../core/defaultFetchHtml.js";
import { shouldRunLlmEnrichment } from "./llmEnv.js";

/**
 * HTML is used for deterministic parsers (cheerio). When LLM enrichment runs,
 * Bright Data can also return a markdown version of the same URL — better signal
 * for editorial copy than flattened body text.
 *
 * When `fetchHtml` is set (e.g. local Playwright), markdown is skipped; LLM still runs on HTML-derived snippets.
 */
export async function scrapeDetailHtmlAndOptionalMarkdown(
  sourceUrl: string,
  enrichWithLlm?: boolean,
  fetchHtml?: (url: string) => Promise<string>,
): Promise<{ html: string; markdown?: string }> {
  const runLlm = shouldRunLlmEnrichment(enrichWithLlm);
  const htmlFetch = fetchHtml ?? defaultBrightDataFetchHtml;

  if (!runLlm) {
    return { html: await htmlFetch(sourceUrl) };
  }

  if (fetchHtml) {
    return { html: await fetchHtml(sourceUrl) };
  }

  const { scrapeHtml, scrapeMarkdown } = await import("../../brightdata.js");
  const [html, markdown] = await Promise.all([
    scrapeHtml(sourceUrl),
    scrapeMarkdown(sourceUrl).catch((error) => {
      console.warn(
        `[ingest] Bright Data markdown scrape failed for ${sourceUrl}:`,
        error instanceof Error ? error.message : String(error),
      );
      return undefined as string | undefined;
    }),
  ]);

  return { html, markdown: markdown ?? undefined };
}
