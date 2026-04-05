import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
import {
  absoluteUrl,
  extractBodyText,
  inferLocation,
  mapCategory,
  parsePriceRange,
  parseSpanishDateRange,
  slugFromUrl,
  upsertEvent,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

type GamListingItem = {
  sourceUrl: string;
};

export const ingestGam = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://gam.cl";
  const listingUrl =
    page > 1
      ? absoluteUrl(
          baseUrl,
          `/es/calendario/${String(page).padStart(2, "0")}-2026/`,
        )
      : absoluteUrl(baseUrl, "/es/calendario/");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const listingItems = [
    ...new Set(
      $('a[href*="/es/que-hacer-en-gam/"]')
        .toArray()
        .map((item) => $(item).attr("href"))
        .filter((href): href is string => Boolean(href))
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ]
    .slice(0, limit ?? 20)
    .map((sourceUrl) => ({ sourceUrl }) satisfies GamListingItem);

  const events = [];

  for (const item of listingItems) {
    try {
      const detailHtml = await scrapeHtml(item.sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const title =
        $$("#content h1").first().text().trim() ||
        $$("h1").first().text().trim();
      const categoryText =
        $$("body")
          .text()
          .match(
            /\b(Teatro|Danza|Música clásica|Música popular|Actividades|Artes Visuales y Mediales|Ideas y Pensamiento)\b/i,
          )?.[0] ?? "Especiales";
      const dateMatch = text.match(
        /\d{1,2}\s*(?:abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)[^]{0,120}/i,
      );
      const dateInfo = parseSpanishDateRange(dateMatch?.[0] ?? text);
      const venueName =
        text.match(/Sala\s+[A-Z0-9-]+(?:\s*\([^)]+\))?/i)?.[0] ??
        "Centro Cultural Gabriela Mistral";
      const address = "Av. Libertador Bernardo O'Higgins 227, Santiago, Chile";
      const priceText =
        text.match(/\$\s*[\d.]+(?:[^$]{0,80}\$\s*[\d.]+){0,5}/)?.[0] ?? null;
      const pricing = parsePriceRange(priceText);
      const description =
        $$(".entry-content, .single-content, main")
          .find("p")
          .toArray()
          .map((node) => $$(node).text().trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(" ") || text.slice(0, 2000);
      const location = inferLocation(address);

      const candidate: EventCandidate = {
        source: "gam",
        sourceType: SourceType.venue,
        sourceUrl: item.sourceUrl,
        sourceEventId: slugFromUrl(item.sourceUrl),
        ticketUrl: item.sourceUrl,
        title,
        description,
        imageUrl:
          $$('meta[property="og:image"]').attr("content") ??
          $$("img").first().attr("src") ??
          null,
        dateText: dateMatch?.[0] ?? null,
        startAtIso: dateInfo.startAt.toISOString(),
        endAtIso: dateInfo.endAt?.toISOString() ?? null,
        allDay: dateInfo.allDay,
        venueName,
        address,
        commune: location.commune,
        city: location.city,
        region: location.region,
        isFree: pricing.isFree,
        priceText,
        priceMin: pricing.priceMin,
        priceMax: pricing.priceMax,
        categoryText,
        categoryPrimary: mapCategory(categoryText),
        categoriesSource: [categoryText],
        tags: ["gam"],
        parserPayload: {
          listing: item.sourceUrl,
          detailText: text.slice(0, 4000),
        },
        qualityScore: 84,
      };

      const snippets: RawSnippets = {
        detail: text.slice(0, 8000),
        pricing: priceText ?? undefined,
      };

      const { event, enrichFailed } = await finalizeIngestedEvent(
        candidate,
        snippets,
        { enrichWithLlm },
      );
      if (enrichFailed) {
        errors.push({
          stage: "enrich",
          url: item.sourceUrl,
          message: "OpenAI enrichment failed; stored parser-only fields",
        });
      }
      events.push(event);
    } catch (error) {
      errors.push({
        stage: "detail",
        url: item.sourceUrl,
        message:
          error instanceof Error ? error.message : "Unknown detail error",
      });
    }
  }

  if (persist) {
    for (const event of events) {
      try {
        await upsertEvent(event);
      } catch (error) {
        errors.push({
          stage: "persist",
          url: event.sourceUrl,
          message:
            error instanceof Error
              ? error.message
              : "Unknown persistence error",
        });
      }
    }
  }

  return {
    source: "gam",
    listingUrl,
    page,
    count: events.length,
    processed: listingItems.length,
    skipped: Math.max(listingItems.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
