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

/** Título desde el detalle sin fallback a slug (para fusionar con prefetch del listado). */
function tryPuntoticketTitleFromDetail(
  $$: ReturnType<typeof load>,
): string | null {
  const og = $$('meta[property="og:title"]').attr("content")?.trim();
  if (og) {
    const parts = og
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    const withoutVendor = parts.filter(
      (p) => !/punto\s*ticket|^entradas\s+por/i.test(p),
    );
    const head = (withoutVendor[0] ?? og).trim();
    if (head) {
      return head;
    }
  }
  const titleTag = $$("title").text().trim();
  if (titleTag) {
    const cleaned = titleTag
      .replace(/^Entradas\s*/i, "")
      .replace(/\s+-\s+.*$/, "")
      .replace(/\s*\|\s*Entradas por Punto Ticket\s*$/i, "")
      .trim();
    if (cleaned) {
      return cleaned;
    }
  }
  const h1 = $$("h1").first().text().trim();
  if (h1) {
    return h1;
  }
  return null;
}

/** Fase 1: índice `/todos` — enlaces + datos de tarjeta si existen en el DOM. */
function parsePuntoticketListingRows(
  $: ReturnType<typeof load>,
  baseUrl: string,
): ListingRow[] {
  const rows: ListingRow[] = [];

  const pushRow = (params: {
    href: string;
    card?: Cheerio<AnyNode>;
    linkText?: string;
  }) => {
    const url = absoluteUrl(baseUrl, params.href);
    if (/\/paginas\//.test(url) || /\/evento\/?$/.test(url)) {
      return;
    }
    const card = params.card;
    const imageUrl = card
      ? extractImageUrl(card.find("img").first())
      : null;
    const cardTitle = card
      ? card
          .find("h2, h3, h4, .titulo-evento, [class*='title'], .card-title")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim() ||
        card.find("a[href]").first().attr("title")?.trim() ||
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

  const articles = $("#listado-eventos-shuffle article");
  if (articles.length > 0) {
    articles.toArray().forEach((node) => {
      const card = $(node);
      const href = card.find("a[href]").first().attr("href");
      if (!href) {
        return;
      }
      pushRow({ href, card });
    });
  }

  if (rows.length === 0) {
    const listingAnchors =
      $("#listado-eventos-shuffle article a[href]").length > 0
        ? $("#listado-eventos-shuffle article a[href]")
        : $("#listado-eventos-shuffle a[href]");
    listingAnchors.toArray().forEach((node) => {
      const el = $(node);
      const href = el.attr("href");
      if (!href) {
        return;
      }
      const article = el.closest("article");
      if (article.length > 0) {
        pushRow({ href, card: article });
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

export const ingestPuntoticket = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
  fetchHtml: fetchHtmlOpt,
}: IngestSourceOptions = {}) => {
  const fetchHtml = fetchHtmlOpt ?? defaultBrightDataFetchHtml;
  const baseUrl = "https://www.puntoticket.com";
  const listingUrl = absoluteUrl(baseUrl, "/todos");
  const errors: IngestionError[] = [];
  const listingHtml = await fetchHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const listingRows = parsePuntoticketListingRows($, baseUrl);
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

      if (
        !/COMPRA(?:R)?\s+TICKET|SELECCIONA\s+FUNCI[ÓO]N|SECTORES?\s+PRECIO|Obt[eé]n tu ticket|info evento/i.test(
          text,
        )
      ) {
        continue;
      }

      const title = mergeListingDetailStrings({
        detailTitle: tryPuntoticketTitleFromDetail($$) ?? "",
        listingTitle: row.prefetch.title,
        sourceUrl,
      });
      const h2Headline = $$("h2").first().text().replace(/\s+/g, " ").trim();
      const categoryText =
        text.match(
          /\b(Rock|Festival|Pop Latino|Baladas|Reggaetón|Heavy Metal|Techno|Funk|Humor|Infantil|Fútbol|Conciertos|Teatro|Familia|Especiales|Salsa|Disco|K-Pop)\b/i,
        )?.[0] ?? "Especiales";
      const dateText =
        text.match(/\d{2}-\d{2}-20\d{2}\s+\d{2}:\d{2}\s*Hrs\./i)?.[0] ??
        text.match(
          /Fecha\s+\d{1,2}\s*(?:de)?\s*[a-záéíóú]+\s*20\d{2}\s*\/\s*\d{1,2}:\d{2}\s*Hrs\./i,
        )?.[0] ??
        text.match(
          /\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2}(?:\s+al\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2})?/i,
        )?.[0] ??
        title.match(
          /\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2}(?:\s+al\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2})?/i,
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
      const venueLine =
        text.match(/Lugar\s+(.+?)\s+Tipo de evento/i)?.[1] ??
        text.match(
          /(?:Rock|Festival|Pop Latino|Baladas|Reggaetón|Heavy Metal|Techno|Funk|Humor|Infantil|Fútbol|Conciertos|Teatro|Familia|Especiales|Salsa|Disco|K-Pop)\s+([^\d]+?)\s+\d{2}-\d{2}-20\d{2}/i,
        )?.[1] ??
        text.match(/([A-ZÁÉÍÓÚ0-9' .-]+)\s+\d{2}-\d{2}-20\d{2}/i)?.[1] ??
        h2Headline.match(/\ben\s+(.+)$/i)?.[1] ??
        title.match(/\ben\s+(.+?)\s*·/i)?.[1] ??
        null;
      const venueNameRaw =
        normalizeVenueName(venueLine?.trim()) ?? venueLine?.trim() ?? null;
      const venueName = venueNameRaw ?? "Venue por confirmar";
      const address = venueName;
      const location = inferLocation(address);
      const priceText =
        text.match(
          /Sector Precio[^]+?Precio total incluye cargo por servicio\./i,
        )?.[0] ??
        text.match(/\$\s*[\d.]+(?:[^$]{0,120}\$\s*[\d.]+){0,6}/)?.[0] ??
        null;
      const pricing = parsePriceRange(priceText);
      const eventText =
        text.match(
          /EVENTO[^]+?PRODUCE:[^]+?(?:COMPRA TU ENTRADA|Nuestro sitio web utiliza cookies)/i,
        )?.[0] ??
        text.match(
          /EVENTO[^]+?(?:VER MÁS Ver menos|SELECCIONA FUNCI[ÓO]N|COMPRA TU ENTRADA)/i,
        )?.[0] ??
        null;
      const description = eventText ?? text.slice(0, 1800);
      const imageUrl = mergeOptionalImage(
        $$('meta[property="og:image"]').attr("content") ??
          $$("img")
            .toArray()
            .map((node) => extractImageUrl($$(node)))
            .find((src) => Boolean(src && src.includes("eventos"))) ??
          null,
        row.prefetch.imageUrl,
      );
      const audience = mapAudience(text);

      if (!resolvedDateText || !dateInfo) {
        errors.push({
          stage: "normalize",
          url: sourceUrl,
          message: "PuntoTicket event skipped due to missing date",
        });
        continue;
      }

      const candidate: EventCandidate = {
        source: "puntoticket",
        sourceType: SourceType.ticketing,
        sourceUrl,
        sourceEventId: slugFromUrl(sourceUrl),
        ticketUrl: sourceUrl,
        title,
        description,
        imageUrl,
        dateText: resolvedDateText,
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
        tags: ["puntoticket", "ticketing"],
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
        qualityScore: 86,
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
          `PAGE_TEXT:\n${text.slice(0, 4000)}`,
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
    source: "puntoticket",
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
