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

export const ingestPuntoticket = async ({
  page = 1,
  limit,
  persist = false,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://www.puntoticket.com";
  const listingUrl = absoluteUrl(baseUrl, "/todos");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const requestedLimit = limit ?? 20;
  const candidateLinks = [
    ...new Set(
      $("a[href]")
        .toArray()
        .map((node) => $(node).attr("href"))
        .filter((href): href is string => Boolean(href))
        .filter(
          (href) =>
            href.startsWith("/") &&
            !href.startsWith("//") &&
            !href.includes("/Account/") &&
            !href.includes("/Cliente/") &&
            href !== "/" &&
            href !== "/todos" &&
            href !== "/musica" &&
            href !== "/deportes" &&
            href !== "/teatro" &&
            href !== "/familia" &&
            href !== "/especiales",
        )
        .map((href) => absoluteUrl(baseUrl, href)),
    ),
  ]
    .filter((url) => !/\/paginas\//.test(url) && !/\/evento\/?$/.test(url))
    .slice((page - 1) * requestedLimit * 10, page * requestedLimit * 10);
  const events = [];

  for (const sourceUrl of candidateLinks) {
    try {
      const detailHtml = await scrapeHtml(sourceUrl);
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
        null;
      const dateInfo = parseSpanishDateRange(dateText ?? text);
      const venueLine =
        text.match(/Lugar\s+(.+?)\s+Tipo de evento/i)?.[1] ??
        text.match(
          /(?:Rock|Festival|Pop Latino|Baladas|Reggaetón|Heavy Metal|Techno|Funk|Humor|Infantil|Fútbol|Conciertos|Teatro|Familia|Especiales|Salsa|Disco|K-Pop)\s+([^\d]+?)\s+\d{2}-\d{2}-20\d{2}/i,
        )?.[1] ??
        text.match(/([A-ZÁÉÍÓÚ0-9' .-]+)\s+\d{2}-\d{2}-20\d{2}/i)?.[1] ??
        "Venue sin informar";
      const venueName = normalizeVenueName(venueLine.trim()) ?? venueLine.trim();
      const address = venueName;
      const location = inferLocation(address);
      const priceText =
        text.match(/Sector Precio[^]+?Precio total incluye cargo por servicio\./i)?.[0] ??
        text.match(/\$\s*[\d.]+(?:[^$]{0,120}\$\s*[\d.]+){0,6}/)?.[0] ??
        null;
      const pricing = parsePriceRange(priceText);
      const description =
        text.match(/EVENTO[^]+?PRODUCE:[^]+?(?:COMPRA TU ENTRADA|Nuestro sitio web utiliza cookies)/i)?.[0] ??
        text.slice(0, 1800);
      const imageUrl =
        $$('meta[property="og:image"]').attr("content") ??
        $$("img")
          .toArray()
          .map((node) => $$(node).attr("src"))
          .find((src) => Boolean(src && src.includes("eventos"))) ??
        null;
      const audience = mapAudience(text);

      if (!dateText || venueName === "Venue sin informar") {
        errors.push({
          stage: "normalize",
          url: sourceUrl,
          message: "PuntoTicket event skipped due to missing date or venue",
        });
        continue;
      }

      events.push(
        defaultEvent({
          source: "puntoticket",
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
          tags: ["puntoticket", "ticketing"],
          audience,
          rawPayload: {
            detailText: text.slice(0, 5000),
          },
          qualityScore: 86,
        }),
      );

      if (events.length >= requestedLimit) {
        break;
      }
    } catch (error) {
      errors.push({
        stage: "detail",
        url: sourceUrl,
        message: error instanceof Error ? error.message : "Unknown detail error",
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
            error instanceof Error ? error.message : "Unknown persistence error",
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
