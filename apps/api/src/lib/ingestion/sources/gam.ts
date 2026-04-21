import { load, type Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import { SourceType } from "../../../generated/prisma/enums.js";
import type { EventCreateInput } from "../../validation/events.schema.js";
import { defaultBrightDataFetchHtml } from "../core/defaultFetchHtml.js";
import {
  absoluteUrl,
  extractBodyText,
  extractImageUrl,
  getMeaningfulParagraphs,
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
import { GENERIC_SPANISH_DATE_REGEX } from "../core/parsing-constants.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";
import {
  dedupeListingRowsByUrl,
  mergeListingDetailStrings,
  mergeOptionalDateText,
  mergeOptionalImage,
  type ListingRow,
} from "../pipeline/twoStepListing.js";

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

function tryGamTitleFromDetail(
  $$: ReturnType<typeof load>,
  jsonLdName: string | undefined,
): string | null {
  const og = $$('meta[property="og:title"]').attr("content")?.trim();
  if (og) {
    const cleaned = og.replace(/\s*\|\s*GAM\s*$/i, "").trim();
    if (cleaned) {
      return cleaned;
    }
  }
  const h1 =
    $$("h1").first().text().trim() ||
    $$("#content h1").first().text().trim();
  if (h1) {
    return h1;
  }
  if (jsonLdName?.trim()) {
    return jsonLdName.trim();
  }
  return null;
}

/** Fase 1: calendario — enlaces a fichas `/es/que-hacer-en-gam/...` con prefetch de tarjeta si existe. */
function parseGamListingRows(
  $: ReturnType<typeof load>,
  baseUrl: string,
): ListingRow[] {
  const rows: ListingRow[] = [];
  $('a[href*="/es/que-hacer-en-gam/"]').each((_i, node) => {
    const el = $(node);
    const href = el.attr("href");
    if (
      !href ||
      !/\/es\/que-hacer-en-gam\/[^/]+\/[^/]+\/?$/i.test(href)
    ) {
      return;
    }
    const sourceUrl = absoluteUrl(baseUrl, href);
    const card = el.closest(
      "article, li, .hentry, [class*='event'], [class*='card']",
    ) as Cheerio<AnyNode>;
    const listingSnippet = card.length
      ? card.text().replace(/\s+/g, " ").trim().slice(0, 1200)
      : el.text().replace(/\s+/g, " ").trim().slice(0, 800);
    const prefetchTitle =
      card.find("h1, h2, h3, h4").first().text().replace(/\s+/g, " ").trim() ||
      null;
    const imageUrl = card.length
      ? extractImageUrl(card.find("img").first())
      : extractImageUrl(el.find("img").first());
    rows.push({
      sourceUrl,
      sourceEventId: slugFromUrl(sourceUrl),
      prefetch: {
        ...(prefetchTitle ? { title: prefetchTitle } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        listingSnippet,
      },
    });
  });
  return dedupeListingRowsByUrl(rows);
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
  const calendarYear = String(new Date().getFullYear());
  const listingUrl =
    page > 1
      ? absoluteUrl(
          baseUrl,
          `/es/calendario/${String(page).padStart(2, "0")}-${calendarYear}/`,
        )
      : absoluteUrl(baseUrl, "/es/calendario/");
  const errors: IngestionError[] = [];
  const listingHtml = await fetchHtml(listingUrl);
  const $ = load(listingHtml);
  const listingRows = parseGamListingRows($, baseUrl).slice(0, limit ?? 20);

  const events: EventCreateInput[] = [];

  for (const row of listingRows) {
    try {
      const detailHtml = await fetchHtml(row.sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const jsonLdEvent = parseGamJsonLdEvent($$);
      const title = mergeListingDetailStrings({
        detailTitle: tryGamTitleFromDetail($$, jsonLdEvent?.name) ?? "",
        listingTitle: row.prefetch.title,
        sourceUrl: row.sourceUrl,
      });
      const categoryText =
        jsonLdEvent?.genre?.trim() ??
        $$("body")
          .text()
          .match(
            /\b(Teatro|Danza|Música clásica|Música popular|Actividades|Artes Visuales y Mediales|Ideas y Pensamiento)\b/i,
          )?.[0] ??
        "Especiales";
      const jsonStart = jsonLdEvent?.startDate?.trim();
      const jsonStartDate =
        jsonStart && !Number.isNaN(Date.parse(jsonStart))
          ? new Date(jsonStart)
          : null;
      const dateSnippet = mergeOptionalDateText(
        jsonStart ??
          [...text.matchAll(GENERIC_SPANISH_DATE_REGEX)][0]?.[0] ??
          text
            .match(
              /\d{1,2}\s*(?:abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)[^]{0,120}/i,
            )?.[0] ??
          null,
        row.prefetch.dateText,
      );
      const dateInfo = jsonStartDate
        ? {
            startAt: jsonStartDate,
            endAt:
              jsonLdEvent?.endDate &&
              !Number.isNaN(Date.parse(jsonLdEvent.endDate))
                ? new Date(jsonLdEvent.endDate)
                : null,
            allDay: jsonStart ? !/T\d{2}:\d{2}/.test(jsonStart) : false,
          }
        : parseSpanishDateRange(dateSnippet ?? text);
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
        stripHtmlTags(jsonLdEvent?.description?.trim()) ||
        getMeaningfulParagraphs(detailHtml, [
          ".entry-content p",
          ".single-content p",
          "#content .entry-content p",
          "main p",
          "article p",
        ]) ||
        text.slice(0, 2000);
      const location = inferLocation(address);

      const candidate: EventCandidate = {
        source: "gam",
        sourceType: SourceType.venue,
        sourceUrl: row.sourceUrl,
        sourceEventId: slugFromUrl(row.sourceUrl),
        ticketUrl: row.sourceUrl,
        title,
        description,
        imageUrl: mergeOptionalImage(
          (Array.isArray(jsonLdEvent?.image)
            ? jsonLdEvent?.image.find((value) => Boolean(value))
            : jsonLdEvent?.image) ??
            $$('meta[property="og:image"]').attr("content") ??
            extractImageUrl($$("img").first()) ??
            null,
          row.prefetch.imageUrl,
        ),
        dateText: dateSnippet ?? null,
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
          listingPrefetch: row.prefetch,
          detailText: text.slice(0, 4000),
        },
        qualityScore: 84,
      };

      const snippets: RawSnippets = {
        ...(row.prefetch.listingSnippet
          ? {
              listing: `LISTING:\n${row.prefetch.listingSnippet.slice(0, 7500)}`,
            }
          : {}),
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
          url: row.sourceUrl,
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
        url: row.sourceUrl,
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
    processed: listingRows.length,
    skipped: Math.max(listingRows.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
