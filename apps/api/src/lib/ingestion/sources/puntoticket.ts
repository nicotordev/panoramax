import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
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
  upsertEvent,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import { scrapeDetailHtmlAndOptionalMarkdown } from "../pipeline/scrapeDetailForIngest.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

export const ingestPuntoticket = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://www.puntoticket.com";
  const listingUrl = absoluteUrl(baseUrl, "/todos");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const listingLinks = [
    ...new Set(
      $("#listado-eventos-shuffle article a[href]")
        .toArray()
        .map((node) => $(node).attr("href"))
        .filter((href): href is string => Boolean(href))
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ].filter((url) => !/\/paginas\//.test(url) && !/\/evento\/?$/.test(url));
  const offset = Math.max(page - 1, 0) * requestedLimit;
  const candidateLinks = listingLinks.slice(offset, offset + requestedLimit);
  const events = [];
  const genericSpanishDateMatch =
    /\d{1,2}\s*(?:de)?\s*(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)(?:\s*(?:de)?\s*20\d{2})?(?:[^\d]{1,10}\d{1,2}[:.]\d{2})?/i;

  for (const sourceUrl of candidateLinks) {
    try {
      const { html: detailHtml, markdown: pageMarkdown } =
        await scrapeDetailHtmlAndOptionalMarkdown(sourceUrl, enrichWithLlm);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);

      if (
        !/COMPRA(?:R)?\s+TICKET|SELECCIONA\s+FUNCI[ÓO]N|SECTORES?\s+PRECIO|Obt[eé]n tu ticket|info evento/i.test(
          text,
        )
      ) {
        continue;
      }

      const title =
        $$("h1").first().text().trim() ||
        $$("title")
          .text()
          .replace(/^Entradas\s*/i, "")
          .replace(/\s+-\s+.*$/, "")
          .trim() ||
        slugFromUrl(sourceUrl);
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
        text.match(genericSpanishDateMatch)?.[0] ?? null;
      const resolvedDateText = dateText ?? parsedDateFallback;
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
      const imageUrl =
        $$('meta[property="og:image"]').attr("content") ??
        $$("img")
          .toArray()
          .map((node) => extractImageUrl($$(node)))
          .find((src) => Boolean(src && src.includes("eventos"))) ??
        null;
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
        },
        qualityScore: 86,
      };

      const snippets: RawSnippets = {
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
    processed: candidateLinks.length,
    skipped: Math.max(candidateLinks.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
