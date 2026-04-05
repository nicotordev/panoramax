import { load } from "cheerio";
import { SourceType } from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
import {
  absoluteUrl,
  extractBodyText,
  inferLocation,
  isPastEvent,
  mapCategory,
  normalizeVenueName,
  parseSpanishDateRange,
  slugFromUrl,
  upsertEvent,
  type IngestSourceOptions,
  type IngestionError,
  type IngestionResult,
} from "../core/shared.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

const isPotentialEventArticle = (title: string, text: string) =>
  /chile|concierto|show|festival|tour|lollapalooza|movistar|teatro|arena/i.test(
    `${title} ${text}`,
  );

export const ingestAgendaMusical = async ({
  page = 1,
  limit,
  persist = false,
  enrichWithLlm,
}: IngestSourceOptions = {}) => {
  const baseUrl = "https://www.agendamusical.cl";
  const listingUrl =
    page > 1
      ? absoluteUrl(baseUrl, `/page/${page}/`)
      : absoluteUrl(baseUrl, "/");
  const errors: IngestionError[] = [];
  const listingHtml = await scrapeHtml(listingUrl);
  const $ = load(listingHtml);
  const cards = $("article")
    .toArray()
    .map((node) => {
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
        return null;
      }

      return {
        sourceUrl: absoluteUrl(baseUrl, href),
        title,
      };
    })
    .filter((item): item is { sourceUrl: string; title: string } =>
      Boolean(item),
    )
    .slice(0, limit ?? 12);
  const events = [];

  for (const item of cards) {
    try {
      const detailHtml = await scrapeHtml(item.sourceUrl);
      const $$ = load(detailHtml);
      const text = extractBodyText(detailHtml);
      const dateMatch = text.match(
        /\d{1,2}\s*(?:de)?\s*(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)(?:\s*de\s*20\d{2})?/i,
      );

      if (!dateMatch) {
        errors.push({
          stage: "normalize",
          url: item.sourceUrl,
          message: "Agenda Musical article without parsable future date",
        });
        continue;
      }

      const dateInfo = parseSpanishDateRange(dateMatch[0]);
      const title =
        $$("h1").first().text().replace(/\s+/g, " ").trim() || item.title;
      const description =
        $$("article p")
          .toArray()
          .map((node) => $$(node).text().trim())
          .filter(Boolean)
          .slice(0, 5)
          .join(" ") || text.slice(0, 1800);
      const venueMatch = text.match(
        /(?:teatro|movistar arena|caupolic[aá]n|coliseo|club chocolate|blondie|estadio [a-záéíóúñ' -]+)/i,
      );
      const venueName =
        normalizeVenueName(venueMatch?.[0]) ?? "Venue por confirmar";
      const location = inferLocation(`${venueName} ${text}`);
      const imageUrl =
        $$('meta[property="og:image"]').attr("content") ??
        $$("img").first().attr("src") ??
        null;
      const categoryText = title;

      const candidate: EventCandidate = {
        source: "agenda_musical",
        sourceType: SourceType.editorial,
        sourceUrl: item.sourceUrl,
        sourceEventId: slugFromUrl(item.sourceUrl),
        title,
        description,
        imageUrl,
        dateText: dateMatch[0],
        startAtIso: dateInfo.startAt.toISOString(),
        endAtIso: dateInfo.endAt?.toISOString() ?? null,
        allDay: dateInfo.allDay,
        venueName,
        address: venueName,
        commune: location.commune,
        city: location.city,
        region: location.region,
        categoryText,
        categoryPrimary: mapCategory(title),
        categoriesSource: ["agenda_musical"],
        tags: ["agenda-musical", "editorial"],
        parserPayload: {
          detailText: text.slice(0, 5000),
        },
        qualityScore: 62,
        needsReview: true,
        reviewNotes:
          "Fuente editorial: revisar venue, precios y ticket URL antes de usar como evento canónico",
      };

      const snippets: RawSnippets = {
        detail: text.slice(0, 8000),
        listing: item.title,
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
    processed: cards.length,
    skipped: Math.max(cards.length - events.length, 0),
    persisted: persist,
    errors,
    events,
  } satisfies IngestionResult;
};
