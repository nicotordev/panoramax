import { load, type Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import { SourceType } from "../../../generated/prisma/enums.js";
import { defaultBrightDataFetchHtml } from "../core/defaultFetchHtml.js";
import {
  absoluteUrl,
  extractBodyText,
  extractImageUrl,
  inferLocation,
  isPastEvent,
  mapAudience,
  mapCategory,
  normalizeVenueName,
  parsePriceRange,
  parseSpanishDateRange,
  slugFromUrl,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared-pure.js";
import { ticketingSnippetLooksPolluted } from "../pipeline/descriptionPollution.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import { scrapeDetailHtmlAndOptionalMarkdown } from "../pipeline/scrapeDetailForIngest.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";
import {
  dedupeListingRowsByUrl,
  mergeListingDetailStrings,
  mergeOptionalDateText,
  mergeOptionalImage,
  type ListingRow,
} from "../pipeline/twoStepListing.js";
import { GENERIC_SPANISH_DATE_REGEX } from "../core/parsing-constants.js";

/**
 * Never use a raw body-text slice as description (it pulls nav, country picker, etc.).
 * Prefer the regex "event" block; otherwise a clean intro; otherwise leave null for LLM/title-only.
 */
function pickTicketplusDescription(params: {
  eventText: string | null;
  introText: string | null;
}): string | null {
  const eventBlock = params.eventText?.trim();
  if (eventBlock && !ticketingSnippetLooksPolluted(eventBlock)) {
    return eventBlock;
  }

  const intro = params.introText?.trim() ?? "";
  if (intro.length >= 24 && !ticketingSnippetLooksPolluted(intro)) {
    return intro;
  }

  return null;
}

type TicketplusJsonLdEvent = {
  ["@type"]?: string;
  name?: string;
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

function parseTicketplusJsonLdEvent($$: ReturnType<typeof load>) {
  const scripts = $$('script[type="application/ld+json"]')
    .toArray()
    .map((node) => $$(node).html()?.trim())
    .filter((raw): raw is string => Boolean(raw));

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw) as
        | TicketplusJsonLdEvent
        | TicketplusJsonLdEvent[];
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

/** Título desde el detalle sin fallback a slug (para fusionar con prefetch del listado). */
function tryTicketplusTitleFromDetail(
  $$: ReturnType<typeof load>,
  jsonLdName: string | undefined,
  h2Texts: string[],
): string | null {
  const og = $$('meta[property="og:title"]').attr("content")?.trim();
  if (og) {
    const cleaned = og
      .replace(/^Entradas para\s+/i, "")
      .replace(/\s*-\s*Ticketplus\s*$/i, "")
      .trim();
    if (cleaned) {
      return cleaned;
    }
  }
  if (jsonLdName?.trim()) {
    return jsonLdName.trim();
  }
  const fromH2 = h2Texts.find(
    (value) =>
      value !== "Location" &&
      !value.includes(", Chile") &&
      !/\d{4}|hrs/i.test(value) &&
      !/^event\b/i.test(value) &&
      !/^business\b/i.test(value) &&
      !/^place\b/i.test(value),
  );
  if (fromH2) {
    return fromH2;
  }
  const fromTitle = $$("title")
    .text()
    .match(/Entradas para (.+?) - Ticketplus/i)?.[1]
    ?.trim();
  if (fromTitle) {
    return fromTitle;
  }
  return null;
}

/** Fase 1: índice regional — tarjetas `.element-item` o enlaces sueltos a `/events/`. */
function parseTicketplusListingRows(
  $: ReturnType<typeof load>,
  baseUrl: string,
): ListingRow[] {
  const rows: ListingRow[] = [];

  const pushRow = (params: {
    href: string;
    card?: Cheerio<AnyNode>;
    linkText?: string;
  }) => {
    if (!params.href.startsWith("/events/")) {
      return;
    }
    const url = absoluteUrl(baseUrl, params.href);
    if (/\/events\/(?:abono|membresia)-/i.test(url)) {
      return;
    }
    const card = params.card;
    const imageUrl = card
      ? extractImageUrl(card.find("img").first())
      : null;
    const cardTitle = card
      ? card
          .find("h2, h3, h4, .title, [class*='title']")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim() ||
        card.find("a[href^='/events/'], a[href^=\"/events/\"]").first().attr("title")?.trim() ||
        null
      : null;
    rows.push({
      sourceUrl: url,
      sourceEventId: slugFromUrl(url),
      prefetch: {
        ...(cardTitle ? { title: cardTitle } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        listingSnippet: card
          ? card.text().replace(/\s+/g, " ").trim().slice(0, 1200)
          : (params.linkText ?? "").slice(0, 800),
      },
    });
  };

  const items = $(".element-item");
  if (items.length > 0) {
    items.toArray().forEach((node) => {
      const card = $(node);
      const a = card
        .find("a[href^='/events/'], a[href^=\"/events/\"]")
        .first();
      const href = a.attr("href");
      if (!href) {
        return;
      }
      pushRow({ href, card });
    });
  }

  if (rows.length === 0) {
    const cardEventAnchors = $(
      ".element-item a[href^='/events/'], .element-item a[href^=\"/events/\"]",
    );
    const listingAnchors =
      cardEventAnchors.length > 0
        ? cardEventAnchors
        : $(
            '[data-referal-link], .element-item a[href^="/events/"], a[href^="/events/"]',
          );
    listingAnchors.toArray().forEach((node) => {
      const el = $(node);
      let href = el.attr("href");
      if (!href?.startsWith("/events/")) {
        href =
          el
            .find("a[href^='/events/'], a[href^=\"/events/\"]")
            .first()
            .attr("href") ?? undefined;
      }
      if (!href?.startsWith("/events/")) {
        return;
      }
      const item = el.closest(".element-item");
      if (item.length > 0) {
        pushRow({ href, card: item });
      } else {
        pushRow({
          href,
          linkText: el.text().replace(/\s+/g, " ").trim(),
        });
      }
    });
  }

  return dedupeListingRowsByUrl(rows);
}

export const ingestTicketplus = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
  fetchHtml: fetchHtmlOpt,
}: IngestSourceOptions = {}) => {
  const fetchHtml = fetchHtmlOpt ?? defaultBrightDataFetchHtml;
  const baseUrl = "https://ticketplus.cl";
  const listingUrl = absoluteUrl(baseUrl, "/states/region-metropolitana");
  const errors: IngestionError[] = [];
  const listingHtml = await fetchHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const listingRows = parseTicketplusListingRows($, baseUrl);
  const offset = Math.max(page - 1, 0) * requestedLimit;
  const candidateRows = listingRows.slice(offset, offset + requestedLimit);
  const events = [];

  for (const row of candidateRows) {
    const sourceUrl = row.sourceUrl;
    try {
      const { html: detailHtml, markdown: pageMarkdown } =
        await scrapeDetailHtmlAndOptionalMarkdown(
          sourceUrl,
          enrichWithLlm,
          fetchHtml,
        );
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const jsonLdEvent = parseTicketplusJsonLdEvent($$);
      const h2Texts = $$("h2")
        .toArray()
        .map((node) => $$(node).text().replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const h4Texts = $$("h4")
        .toArray()
        .map((node) => $$(node).text().replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const introText =
        $$(".intro-div").first().text().replace(/\s+/g, " ").trim() || null;
      const title = mergeListingDetailStrings({
        detailTitle:
          tryTicketplusTitleFromDetail($$, jsonLdEvent?.name, h2Texts) ?? "",
        listingTitle: row.prefetch.title,
        sourceUrl,
      });
      const categoryText =
        text.match(/\b(Teatro|Deportes|Fiestas|Música|Familia)\b/i)?.[0] ??
        "Especiales";
      const dateText =
        h2Texts
          .find((value) => /^event\b/i.test(value))
          ?.replace(/^event\s*/i, "") ??
        h2Texts.find((value) => /\d{1,2}.*20\d{2}/i.test(value)) ??
        introText?.match(
          /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+al\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2}/i,
        )?.[0] ??
        null;
      const parsedDateFallback =
        [...text.matchAll(GENERIC_SPANISH_DATE_REGEX)][0]?.[0] ?? null;
      const resolvedDateText = mergeOptionalDateText(
        dateText ?? parsedDateFallback,
        row.prefetch.dateText,
      );
      const dateInfo = resolvedDateText
        ? parseSpanishDateRange(resolvedDateText)
        : null;
      const venueNameRaw =
        normalizeVenueName(
          h2Texts
            .find((value) => /^business\b/i.test(value))
            ?.replace(/^business\s*/i, "") ??
            h4Texts.find((value) =>
              /\/|teatro|arena|club|estadio|matucana/i.test(value),
            ) ??
            jsonLdEvent?.location?.name ??
            null,
        ) ?? null;
      const venueName = venueNameRaw ?? "Venue por confirmar";
      const schemaAddress =
        jsonLdEvent?.location?.address?.streetAddress ||
        jsonLdEvent?.location?.address?.addressLocality ||
        jsonLdEvent?.location?.address?.addressRegion
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
        h2Texts
          .find((value) => /^place\b/i.test(value))
          ?.replace(/^place\s*/i, "") ??
        h2Texts.find((value) => value.includes("Chile") && value !== title) ??
        schemaAddress ??
        null;
      const location = inferLocation(address ?? venueName);
      const priceText =
        text.match(
          /Opciones de Entradas:[^]+?(?:Consideraciones Importantes:|Prepara tu Visita:)/i,
        )?.[0] ??
        text.match(/\$\s*[\d.]+(?:[^$]{0,120}\$\s*[\d.]+){0,8}/)?.[0] ??
        null;
      const pricing = parsePriceRange(priceText);
      const eventText =
        text.match(/Fecha:[^]+?(?:¿Necesitas más ayuda\?|VER MÁS)/i)?.[0] ??
        text.match(
          /[A-ZÁÉÍÓÚ0-9"'“”().,:;!¿? \-/]{20,}Detalles del Evento:[^]+?(?:¿Necesitas más ayuda\?|VER MÁS)/i,
        )?.[0] ??
        null;
      const description = pickTicketplusDescription({ eventText, introText });
      const imageUrl = mergeOptionalImage(
        $$('meta[property="og:image"]').attr("content") ??
          $$("img")
            .toArray()
            .map((node) => extractImageUrl($$(node)))
            .find((src) => Boolean(src && !src.includes("logo"))) ??
          null,
        row.prefetch.imageUrl,
      );
      const audience = mapAudience(text);

      if (!resolvedDateText || !dateInfo) {
        errors.push({
          stage: "normalize",
          url: sourceUrl,
          message: "Ticketplus event skipped due to missing date",
        });
        continue;
      }

      const candidate: EventCandidate = {
        source: "ticketplus",
        sourceType: SourceType.ticketing,
        sourceUrl,
        sourceEventId: slugFromUrl(sourceUrl),
        ticketUrl: sourceUrl,
        title,
        description,
        imageUrl,
        dateText: resolvedDateText,
        startAtIso:
          jsonLdEvent?.startDate &&
          !Number.isNaN(new Date(jsonLdEvent.startDate).getTime())
            ? new Date(jsonLdEvent.startDate).toISOString()
            : dateInfo.startAt.toISOString(),
        endAtIso:
          jsonLdEvent?.endDate &&
          !Number.isNaN(new Date(jsonLdEvent.endDate).getTime())
            ? new Date(jsonLdEvent.endDate).toISOString()
            : (dateInfo.endAt?.toISOString() ?? null),
        allDay:
          jsonLdEvent?.startDate && !/T\d{2}:\d{2}/.test(jsonLdEvent.startDate)
            ? true
            : dateInfo.allDay,
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
        tags: ["ticketplus", "ticketing"],
        audience,
        needsReview: venueNameRaw === null,
        reviewNotes:
          venueNameRaw === null
            ? "Venue missing in source; using fallback venue placeholder"
            : undefined,
        parserPayload: {
          detailText: text.slice(0, 5000),
          listingPrefetch: row.prefetch,
        },
        qualityScore: 88,
      };

      const snippets: RawSnippets = {
        ...(row.prefetch.listingSnippet
          ? {
              listing: `LISTING:\n${row.prefetch.listingSnippet.slice(0, 7500)}`,
            }
          : {}),
        detail: [
          `TITLE:\n${title}`,
          resolvedDateText ? `DATE:\n${resolvedDateText}` : null,
          `VENUE:\n${venueName}`,
          address ? `ADDRESS:\n${address}` : null,
          categoryText ? `CATEGORY:\n${categoryText}` : null,
          eventText ? `EVENT_TEXT:\n${eventText}` : null,
          introText ? `INTRO:\n${introText}` : null,
          eventText && !ticketingSnippetLooksPolluted(eventText)
            ? `PAGE_TAIL:\n${text.slice(0, 1200)}`
            : `PAGE_TEXT:\n${text.slice(0, 4000)}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        pricing: priceText ?? undefined,
        ...(pageMarkdown ? { markdown: pageMarkdown } : {}),
      };

      const { event, enrichFailed, enrichError } = await finalizeIngestedEvent(
        candidate,
        snippets,
        { enrichWithLlm },
      );
      if (enrichFailed) {
        errors.push({
          stage: "enrich",
          url: sourceUrl,
          message:
            enrichError ??
            "OpenAI enrichment failed; stored parser-only fields",
        });
      }

      if (isPastEvent(event)) {
        continue;
      }

      events.push(event);

      if (events.length >= requestedLimit) {
        break;
      }
    } catch (error) {
      errors.push({
        stage: "detail",
        url: sourceUrl,
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
    source: "ticketplus",
    listingUrl,
    page,
    count: events.length,
    processed: candidateRows.length,
    skipped: Math.max(candidateRows.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
