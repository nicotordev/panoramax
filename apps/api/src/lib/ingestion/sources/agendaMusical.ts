import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import type { EventCreateInput } from "../../validation/events.schema.js";
import { defaultBrightDataFetchHtml } from "../core/defaultFetchHtml.js";
import { GENERIC_SPANISH_DATE_REGEX } from "../core/parsing-constants.js";
import {
  absoluteUrl,
  extractBodyText,
  extractImageUrl,
  getMeaningfulParagraphs,
  inferLocation,
  isPastEvent,
  mapCategory,
  normalizeVenueName,
  parseSpanishDateRange,
  slugFromUrl,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared-pure.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";
import {
  mergeListingDetailStrings,
  mergeOptionalDateText,
  mergeOptionalImage,
  type ListingRow,
} from "../pipeline/twoStepListing.js";

const isPotentialEventArticle = (title: string, text: string) =>
  /concierto|show|festival|tour|lollapalooza|movistar|teatro|arena|recital|banda|en\s+vivo|gira|m[uú]sica|entradas|presentaci[oó]n|coliseo|nescaf[eé]/i.test(
    `${title} ${text}`,
  );

type AgendaMusicalBlogPosting = {
  ["@type"]?: string;
  headline?: string;
  image?: { url?: string } | string;
  articleSection?: string;
};

function parseAgendaMusicalBlogPosting($$: ReturnType<typeof load>) {
  const scripts = $$('script[type="application/ld+json"]')
    .toArray()
    .map((node) => $$(node).html()?.trim())
    .filter((raw): raw is string => Boolean(raw));

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw) as {
        "@graph"?: AgendaMusicalBlogPosting[];
      };
      const post =
        parsed?.["@graph"]?.find((item) => item?.["@type"] === "BlogPosting") ??
        null;
      if (post) {
        return post;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractVenueFromTitle(title: string) {
  return (
    title.match(/\ben\s+(?:el|la|los|las)\s+([^,·|]+)$/i)?.[1]?.trim() ??
    title.match(/\ben\s+([^,·|]+)$/i)?.[1]?.trim() ??
    null
  );
}

function tryAgendaMusicalTitleFromDetail(
  $$: ReturnType<typeof load>,
  blogHeadline: string | undefined,
): string | null {
  const og = $$('meta[property="og:title"]').attr("content")?.trim();
  if (og && !/^agenda\s+musical\s*\|/i.test(og) && og.length > 8) {
    return og.replace(/\s*\|\s*Agenda\s+Musical.*$/i, "").trim();
  }
  const h1 = $$("h1").first().text().replace(/\s+/g, " ").trim();
  if (h1) {
    return h1;
  }
  if (blogHeadline?.trim()) {
    return blogHeadline.trim();
  }
  return null;
}

export const ingestAgendaMusical = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
  fetchHtml: fetchHtmlOpt,
}: IngestSourceOptions = {}) => {
  const fetchHtml = fetchHtmlOpt ?? defaultBrightDataFetchHtml;
  const baseUrl = "https://www.agendamusical.cl";
  const listingUrl =
    page > 1
      ? absoluteUrl(baseUrl, `/page/${page}/`)
      : absoluteUrl(baseUrl, "/");
  const errors: IngestionError[] = [];
  const listingHtml = await fetchHtml(listingUrl);
  const $ = load(listingHtml);
  const cardNodes =
    $("main article").length > 0 ? $("main article") : $("article");
  const listingRows: ListingRow[] = [];
  for (const node of cardNodes.toArray()) {
    const card = $(node);
    const title = card
      .find("h1,h2,h3,h4")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const href = card.find("a[href]").first().attr("href");
    const text = card.text().replace(/\s+/g, " ").trim();

    if (!href || !title || !isPotentialEventArticle(title, text)) {
      continue;
    }

    const sourceUrl = absoluteUrl(baseUrl, href);
    const imageUrl = extractImageUrl(card.find("img").first());
    listingRows.push({
      sourceUrl,
      sourceEventId: slugFromUrl(sourceUrl),
      prefetch: {
        title,
        listingSnippet: text.slice(0, 1200),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
  }
  const cappedListingRows = listingRows.slice(0, limit ?? 12);
  const events: EventCreateInput[] = [];

  for (const row of cappedListingRows) {
    try {
      const detailHtml = await fetchHtml(row.sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const blogPosting = parseAgendaMusicalBlogPosting($$);
      const articleSection = blogPosting?.articleSection?.toLowerCase() ?? "";
      if (/review|reseña|resena|fotos|crónica|cronica/i.test(articleSection)) {
        continue;
      }
      const timeIso = $$("time[datetime]").first().attr("datetime")?.trim();
      const dateMatch = mergeOptionalDateText(
        (timeIso && !Number.isNaN(Date.parse(timeIso))
          ? timeIso
          : [...text.matchAll(GENERIC_SPANISH_DATE_REGEX)][0]?.[0]) ?? null,
        row.prefetch.dateText,
      );

      if (!dateMatch) {
        errors.push({
          stage: "normalize",
          url: row.sourceUrl,
          message: "Agenda Musical article without parsable future date",
        });
        continue;
      }

      const dateInfo = timeIso && !Number.isNaN(Date.parse(timeIso))
        ? {
            startAt: new Date(timeIso),
            endAt: null,
            allDay: !/T\d{2}:\d{2}/.test(timeIso),
          }
        : parseSpanishDateRange(dateMatch);
      const title = mergeListingDetailStrings({
        detailTitle:
          tryAgendaMusicalTitleFromDetail($$, blogPosting?.headline) ?? "",
        listingTitle: row.prefetch.title,
        sourceUrl: row.sourceUrl,
      });
      const description =
        getMeaningfulParagraphs(detailHtml, [
          "article .entry-content p",
          ".entry-content p",
          "article p",
          "main p",
        ]) || text.slice(0, 1800);
      const venueMatch = text.match(
        /(?:teatro|movistar arena|caupolic[aá]n|coliseo|club chocolate|blondie|estadio [a-záéíóúñ' -]+)/i,
      );
      const venueName =
        normalizeVenueName(venueMatch?.[0] ?? extractVenueFromTitle(title)) ??
        "Venue por confirmar";
      const location = inferLocation(`${venueName} ${text}`);
      const imageUrl = mergeOptionalImage(
        (typeof blogPosting?.image === "string"
          ? blogPosting.image
          : blogPosting?.image?.url) ??
          $$('meta[property="og:image"]').attr("content") ??
          extractImageUrl($$("img").first()) ??
          null,
        row.prefetch.imageUrl,
      );
      const sectionHint =
        blogPosting?.articleSection?.trim() ||
        $$('meta[property="article:section"]').attr("content")?.trim() ||
        description.slice(0, 200);
      const categoryText = sectionHint || "música";

      const candidate: EventCandidate = {
        source: "agenda_musical",
        sourceType: SourceType.editorial,
        sourceUrl: row.sourceUrl,
        sourceEventId: slugFromUrl(row.sourceUrl),
        title,
        description,
        imageUrl,
        dateText: dateMatch,
        startAtIso: dateInfo.startAt.toISOString(),
        endAtIso: dateInfo.endAt?.toISOString() ?? null,
        allDay: dateInfo.allDay,
        venueName,
        address: venueName,
        commune: location.commune,
        city: location.city,
        region: location.region,
        categoryText,
        categoryPrimary: mapCategory(categoryText),
        categoriesSource: ["agenda_musical"],
        tags: ["agenda-musical", "editorial"],
        parserPayload: {
          listingPrefetch: row.prefetch,
          detailText: text.slice(0, 5000),
        },
        qualityScore: 62,
        needsReview: true,
        reviewNotes:
          "Fuente editorial: revisar venue, precios y ticket URL antes de usar como evento canónico",
      };

      const snippets: RawSnippets = {
        detail: text.slice(0, 8000),
        ...(row.prefetch.listingSnippet
          ? {
              listing: `LISTING:\n${row.prefetch.listingSnippet.slice(0, 7500)}`,
            }
          : {}),
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
    source: "agenda_musical",
    listingUrl,
    page,
    count: events.length,
    processed: cappedListingRows.length,
    skipped: Math.max(cappedListingRows.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
