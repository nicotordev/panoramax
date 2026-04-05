import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
import {
  absoluteUrl,
  defaultEvent,
  extractBodyText,
  inferLocation,
  mapAudience,
  mapCategory,
  normalizeVenueName,
  parsePriceRange,
  parseSpanishDateRange,
  slugFromUrl,
  type IngestionError,
  type IngestionResult,
  type IngestSourceOptions,
  upsertEvent,
} from "../core/shared.js";

export const ingestTicketplus = async ({
  page = 1,
  limit,
  persist = false,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://ticketplus.cl";
  const listingUrl = absoluteUrl(baseUrl, "/states/region-metropolitana");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const candidateLinks = [
    ...new Set(
      $('a[href^="/events/"]')
        .toArray()
        .map((node) => $(node).attr("href"))
        .filter((href): href is string => Boolean(href))
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ]
    .filter((url) => !/\/events\/abono-/i.test(url))
    .slice((page - 1) * requestedLimit * 50, page * requestedLimit * 50);
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
        h2Texts.find((value) => /^event\b/i.test(value))?.replace(/^event\s*/i, "") ??
        h2Texts.find((value) => /\d{1,2}.*20\d{2}/i.test(value)) ??
        introText?.match(
          /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+al\s+(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\s+de\s+[a-záéíóú]+\s+20\d{2}/i,
        )?.[0] ??
        null;
      const dateInfo = parseSpanishDateRange(dateText ?? text);
      const venueName =
        normalizeVenueName(
          h2Texts.find((value) => /^business\b/i.test(value))?.replace(/^business\s*/i, "") ??
            h4Texts.find((value) =>
              /\/|teatro|arena|club|estadio|matucana/i.test(value),
            ) ??
            "Venue sin informar",
        ) ?? "Venue sin informar";
      const address =
        h2Texts.find((value) => /^place\b/i.test(value))?.replace(/^place\s*/i, "") ??
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

      events.push(
        defaultEvent({
          source: "ticketplus",
          sourceType: SourceType.ticketing,
          sourceEventId: slugFromUrl(sourceUrl),
          sourceUrl,
          ticketUrl: sourceUrl,
          title,
          description,
          imageUrl,
          dateText,
          startAt: dateInfo.startAt,
          endAt: dateInfo.endAt,
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
          categoryPrimary: mapCategory(categoryText),
          categoriesSource: [categoryText],
          tags: ["ticketplus", "ticketing"],
          audience,
          rawPayload: {
            detailText: text.slice(0, 5000),
          },
          qualityScore: 88,
        }),
      );

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
