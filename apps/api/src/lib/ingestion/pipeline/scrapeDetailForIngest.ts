import { scrapeHtml, scrapeMarkdown } from "../../brightdata.js";
import { shouldRunLlmEnrichment } from "./llmEnv.js";

/**
 * HTML is used for deterministic parsers (cheerio). When LLM enrichment runs,
 * Bright Data can also return a markdown version of the same URL — better signal
 * for editorial copy than flattened body text.
 */
export async function scrapeDetailHtmlAndOptionalMarkdown(
  sourceUrl: string,
  enrichWithLlm?: boolean,
): Promise<{ html: string; markdown?: string }> {
  const runLlm = shouldRunLlmEnrichment(enrichWithLlm);
  if (!runLlm) {
    return { html: await scrapeHtml(sourceUrl) };
  }

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
