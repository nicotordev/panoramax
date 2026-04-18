import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { defaultBrightDataFetchHtml } from "../core/defaultFetchHtml.js";
import {
  absoluteUrl,
  extractBodyText,
  extractImageUrl,
  inferLocation,
  isPastEvent,
  mapCategory,
  parsePriceRange,
  parseSpanishDateRange,
  slugFromUrl,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared-pure.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

type GamListingItem = {
  sourceUrl: string;
};

type GamJsonLdEvent = {
  ["@type"]?: string;
  name?: string;
  description?: string;
  genre?: string;
  image?: string[] | string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
};

function stripHtmlTags(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return (
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

function parseGamJsonLdEvent($$: ReturnType<typeof load>) {
  const scripts = $$('script[type="application/ld+json"]')
    .toArray()
    .map((node) => $$(node).html()?.trim())
    .filter((raw): raw is string => Boolean(raw));

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw) as GamJsonLdEvent | GamJsonLdEvent[];
      const event =
        (Array.isArray(parsed)
          ? parsed.find((item) => item?.["@type"] === "Event")
          : parsed?.["@type"] === "Event"
            ? parsed
            : null) ?? null;
      if (event) {
        return event;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export const ingestGam = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
  fetchHtml: fetchHtmlOpt,
}: IngestSourceOptions = {}) => {
  const fetchHtml = fetchHtmlOpt ?? defaultBrightDataFetchHtml;
  const baseUrl = "https://gam.cl";
  const listingUrl =
    page > 1
      ? absoluteUrl(
          baseUrl,
          `/es/calendario/${String(page).padStart(2, "0")}-2026/`,
        )
      : absoluteUrl(baseUrl, "/es/calendario/");
  const errors: IngestionError[] = [];
  const listingHtml = await fetchHtml(listingUrl);
  const $ = load(listingHtml);
  const listingItems = [
    ...new Set(
      $('a[href*="/es/que-hacer-en-gam/"]')
        .toArray()
        .map((item) => $(item).attr("href"))
        .filter((href): href is string => Boolean(href))
        .filter((href) =>
          /\/es\/que-hacer-en-gam\/[^/]+\/[^/]+\/?$/i.test(href),
        )
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ]
    .slice(0, limit ?? 20)
    .map((sourceUrl) => ({ sourceUrl }) satisfies GamListingItem);

  const events = [];

  for (const item of listingItems) {
    try {
      const detailHtml = await fetchHtml(item.sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const jsonLdEvent = parseGamJsonLdEvent($$);
      const title =
        $$("#content h1").first().text().trim() ||
        $$("h1").first().text().trim() ||
        jsonLdEvent?.name?.trim() ||
        slugFromUrl(item.sourceUrl);
      const categoryText =
        jsonLdEvent?.genre?.trim() ??
        $$("body")
          .text()
          .match(
            /\b(Teatro|Danza|Música clásica|Música popular|Actividades|Artes Visuales y Mediales|Ideas y Pensamiento)\b/i,
          )?.[0] ??
        "Especiales";
      const dateMatch = text.match(
        /\d{1,2}\s*(?:abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)[^]{0,120}/i,
      );
      const dateInfo = parseSpanishDateRange(dateMatch?.[0] ?? text);
      const venueName =
        stripHtmlTags(jsonLdEvent?.location?.name) ??
        text.match(/Sala\s+[A-Z0-9-]+(?:\s*\([^)]+\))?/i)?.[0] ??
        "Centro Cultural Gabriela Mistral";
      const jsonLdAddress =
        jsonLdEvent?.location?.address?.streetAddress ||
        jsonLdEvent?.location?.address?.addressLocality
          ? [
              jsonLdEvent?.location?.address?.streetAddress,
              jsonLdEvent?.location?.address?.addressLocality,
              jsonLdEvent?.location?.address?.addressRegion,
              jsonLdEvent?.location?.address?.addressCountry,
            ]
              .filter(Boolean)
              .join(", ")
          : null;
      const address =
        jsonLdAddress ??
        "Av. Libertador Bernardo O'Higgins 227, Santiago, Chile";
      const priceText =
        text.match(/\$\s*[\d.]+(?:[^$]{0,80}\$\s*[\d.]+){0,5}/)?.[0] ?? null;
      const pricing = parsePriceRange(priceText);
      const description =
        jsonLdEvent?.description?.trim() ??
        ($$(".entry-content, .single-content, main")
          .find("p")
          .toArray()
          .map((node) => $$(node).text().trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(" ") ||
          text.slice(0, 2000));
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
          (Array.isArray(jsonLdEvent?.image)
            ? jsonLdEvent?.image.find((value) => Boolean(value))
            : jsonLdEvent?.image) ??
          $$('meta[property="og:image"]').attr("content") ??
          extractImageUrl($$("img").first()) ??
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
      if (isPastEvent(event)) {
        continue;
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
    const { upsertEvent } = await import("../core/shared-db.js");
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
