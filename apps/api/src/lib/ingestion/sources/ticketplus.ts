import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
import {
  absoluteUrl,
  extractBodyText,
  inferLocation,
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
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

export const ingestTicketplus = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://ticketplus.cl";
  const listingUrl = absoluteUrl(baseUrl, "/states/region-metropolitana");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const listingLinks = [
    ...new Set(
      $('[data-referal-link], .element-item a[href^="/events/"]')
        .toArray()
        .map((node) => $(node).attr("href"))
        .filter((href): href is string => Boolean(href))
        .filter((href) => href.startsWith("/events/"))
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ].filter((url) => !/\/events\/(?:abono|membresia)-/i.test(url));
  const offset = Math.max(page - 1, 0) * requestedLimit;
  const candidateLinks = listingLinks.slice(offset, offset + requestedLimit);
  const events = [];

  for (const sourceUrl of candidateLinks) {
    try {
      const detailHtml = await scrapeHtml(sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
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
      const title =
        h2Texts.find(
          (value) =>
            value !== "Location" &&
            !value.includes(", Chile") &&
            !/\d{4}|hrs/i.test(value) &&
            !/^event\b/i.test(value) &&
            !/^business\b/i.test(value) &&
            !/^place\b/i.test(value),
        ) ??
        $$("title")
          .text()
          .match(/Entradas para (.+?) - Ticketplus/i)?.[1]
          ?.trim() ??
        slugFromUrl(sourceUrl);
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
      const dateInfo = parseSpanishDateRange(dateText ?? text);
      const venueName =
        normalizeVenueName(
          h2Texts
            .find((value) => /^business\b/i.test(value))
            ?.replace(/^business\s*/i, "") ??
            h4Texts.find((value) =>
              /\/|teatro|arena|club|estadio|matucana/i.test(value),
            ) ??
            "Venue sin informar",
        ) ?? "Venue sin informar";
      const address =
        h2Texts
          .find((value) => /^place\b/i.test(value))
          ?.replace(/^place\s*/i, "") ??
        h2Texts.find((value) => value.includes("Chile") && value !== title) ??
        null;
      const location = inferLocation(address ?? venueName);
      const priceText =
        text.match(
          /Opciones de Entradas:[^]+?(?:Consideraciones Importantes:|Prepara tu Visita:)/i,
        )?.[0] ??
        text.match(/\$\s*[\d.]+(?:[^$]{0,120}\$\s*[\d.]+){0,8}/)?.[0] ??
        null;
      const pricing = parsePriceRange(priceText);
      const description =
        text.match(/Fecha:[^]+?(?:¿Necesitas más ayuda\?|VER MÁS)/i)?.[0] ??
        text.slice(0, 1800);
      const imageUrl =
        $$('meta[property="og:image"]').attr("content") ??
        $$("img")
          .toArray()
          .map((node) => $$(node).attr("src"))
          .find((src) => Boolean(src && !src.includes("logo"))) ??
        null;
      const audience = mapAudience(text);

      if (!dateText || venueName === "Venue sin informar") {
        errors.push({
          stage: "normalize",
          url: sourceUrl,
          message: "Ticketplus event skipped due to missing date or venue",
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
        dateText,
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
        tags: ["ticketplus", "ticketing"],
        audience,
        parserPayload: {
          detailText: text.slice(0, 5000),
        },
        qualityScore: 88,
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
          url: sourceUrl,
          message: "OpenAI enrichment failed; stored parser-only fields",
        });
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
    source: "ticketplus",
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
