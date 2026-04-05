import { load } from "cheerio";
import {
  CategoryPrimary,
  SourceType,
} from "../../../generated/prisma/enums.js";
import { scrapeHtml } from "../../brightdata.js";
import type { EventCreateInput } from "../../validation/events.schema.js";
import type {
  IngestSourceOptions,
  IngestionError,
  IngestionResult,
} from "../core/shared.js";
import { isPastEvent, upsertEvent } from "../core/shared.js";
import { parseChileCulturaStartAt } from "../pipeline/chileDate.js";
import { finalizeIngestedEvent } from "../pipeline/finalizeIngestedEvent.js";
import type { EventCandidate, RawSnippets } from "../pipeline/types.js";

type ChileCulturaListingItem = {
  sourceEventId: string;
  sourceUrl: string;
  title: string;
  location: string;
  dateText: string;
  categoryText: string;
  isFree: boolean;
  imageUrl: string | null;
};

type ChileCulturaDetail = {
  title: string;
  region: string | null;
  timeText: string | null;
  venueName: string | null;
  organizer: string | null;
  audienceText: string | null;
  externalUrl: string | null;
  locationDetails: string[];
  address: string | null;
  description: string | null;
};

export type IngestChileCulturaOptions = IngestSourceOptions;

export class ChileCulturaIngestor {
  private readonly baseUrl = "https://chilecultura.gob.cl";
  private readonly defaultCity = "Santiago";
  private readonly unknownCommune = "Sin comuna informada";

  private static readonly regionNameById: Record<string, string> = {
    "13": "Región Metropolitana de Santiago",
  };

  private static readonly categoryMap: Record<string, CategoryPrimary> = {
    "artes visuales": CategoryPrimary.exhibition,
    cine: CategoryPrimary.special_experience,
    danza: CategoryPrimary.dance,
    teatro: CategoryPrimary.theatre,
    música: CategoryPrimary.music,
    musica: CategoryPrimary.music,
    literatura: CategoryPrimary.workshop,
    bibliotecas: CategoryPrimary.workshop,
    ópera: CategoryPrimary.theatre,
    opera: CategoryPrimary.theatre,
    gastronomía: CategoryPrimary.food_drink,
    gastronomia: CategoryPrimary.food_drink,
    "guía de ferias y festivales del libro": CategoryPrimary.fair,
    "guia de ferias y festivales del libro": CategoryPrimary.fair,
    "guía de librerías": CategoryPrimary.special_experience,
    "guia de librerias": CategoryPrimary.special_experience,
    patrimonio: CategoryPrimary.special_experience,
    arquitectura: CategoryPrimary.special_experience,
    museo: CategoryPrimary.exhibition,
    museos: CategoryPrimary.exhibition,
    "medio ambiente": CategoryPrimary.special_experience,
    "pueblos originarios": CategoryPrimary.special_experience,
    artesanía: CategoryPrimary.fair,
    artesania: CategoryPrimary.fair,
    diseño: CategoryPrimary.special_experience,
    diseno: CategoryPrimary.special_experience,
  };

  private buildListingUrl(region: string | undefined, page: number) {
    const url = new URL("/events/search/", this.baseUrl);

    url.searchParams.set("section-elements-page", String(page));

    if (region) {
      url.searchParams.set("region", region);
    }

    return url.toString();
  }

  private absoluteUrl(pathOrUrl: string) {
    return new URL(pathOrUrl, this.baseUrl).toString();
  }

  private normalizeText(value: string | null | undefined) {
    return value?.replace(/\s+/g, " ").trim() || null;
  }

  private parseListingPage(html: string): ChileCulturaListingItem[] {
    const $ = load(html);

    return $(".event-item")
      .toArray()
      .map((item) => {
        const link = $(item).find("a.event-link").attr("href");
        const sourceEventId = link?.match(/\/events\/(\d+)/)?.[1];

        if (!link || !sourceEventId) {
          return null;
        }

        return {
          sourceEventId,
          sourceUrl: this.absoluteUrl(link),
          title:
            this.normalizeText($(item).find(".event-title").text()) ??
            "Sin título",
          location:
            this.normalizeText($(item).find(".event-location").text()) ??
            "Sin ubicación informada",
          dateText:
            this.normalizeText($(item).find(".event-date").text()) ?? "",
          categoryText:
            this.normalizeText($(item).find(".event-category").text()) ?? "",
          isFree: Boolean(
            this.normalizeText($(item).find(".event-ticket").text()),
          ),
          imageUrl: this.normalizeText(
            $(item).find("img.event-image").attr("src"),
          ),
        } satisfies ChileCulturaListingItem;
      })
      .filter((item): item is ChileCulturaListingItem => item !== null);
  }

  private parseDetailPage(html: string): ChileCulturaDetail {
    const $ = load(html);

    const region = this.normalizeText($(".event-place a").first().text());
    const timeText = this.normalizeText(
      $(".event-hour.event-single span").first().text(),
    );

    const locationBlocks = $(".event-location.event-single.event-single-label")
      .toArray()
      .map((item) => {
        const label = this.normalizeText(
          $(item).find(".event-label").first().text(),
        );
        const location = this.normalizeText(
          $(item).find(".location").first().text(),
        );
        const linkedText = this.normalizeText($(item).find("a").first().text());

        return {
          label,
          value: location || linkedText,
        };
      })
      .filter((item) => item.value);

    const venueBlock = locationBlocks.find((item) => item.label === null);
    const organizerBlock = locationBlocks.find(
      (item) => item.label === "Organiza",
    );
    const audienceText = this.normalizeText(
      $(".event-hour.event-single .event-label").first().text(),
    );

    const locationDetails = $(".event-detail.event-single span")
      .toArray()
      .map((item) => this.normalizeText($(item).text()))
      .filter((item): item is string => item !== null);

    const externalUrl =
      $(".event-price.event-single a")
        .toArray()
        .map((item) => $(item).attr("href"))
        .find((href) => href && href.startsWith("http")) ?? null;

    const scheduleHref = $(".schedule-event").attr("href");
    const address = scheduleHref
      ? this.normalizeText(new URL(scheduleHref).searchParams.get("location"))
      : null;

    const description = this.normalizeText(
      $(".col-lg-12")
        .toArray()
        .map((item) => {
          const heading = this.normalizeText($(item).find("h2").first().text());

          if (heading !== "Descripción") {
            return null;
          }

          return this.normalizeText($(item).find("p").first().text());
        })
        .find((value) => value),
    );

    return {
      title: this.normalizeText($("h1").first().text()) ?? "Sin título",
      region,
      timeText,
      venueName: venueBlock?.value ?? null,
      organizer: organizerBlock?.value ?? null,
      audienceText,
      externalUrl,
      locationDetails,
      address,
      description,
    } satisfies ChileCulturaDetail;
  }

  private mapCategory(categoryText: string) {
    return (
      ChileCulturaIngestor.categoryMap[categoryText.toLowerCase()] ??
      CategoryPrimary.special_experience
    );
  }

  private mapAudience(audienceText: string | null) {
    if (!audienceText) {
      return null;
    }

    const normalized = audienceText.toLowerCase();

    if (
      normalized.includes("todo público") ||
      normalized.includes("todo publico")
    ) {
      return "all_ages" as const;
    }

    if (normalized.includes("familiar")) {
      return "family" as const;
    }

    if (normalized.includes("infantil")) {
      return "kids" as const;
    }

    return "adult" as const;
  }

  private inferSummary(description: string | null) {
    if (!description) {
      return null;
    }

    const [firstSentence] = description.split(/(?<=[.!?])\s+/);

    return firstSentence?.slice(0, 280) ?? description.slice(0, 280);
  }

  private matchesRegion(
    requestedRegion: string | undefined,
    listingItem: ChileCulturaListingItem,
    detail: ChileCulturaDetail,
  ) {
    if (!requestedRegion) {
      return true;
    }

    const expectedRegionName =
      ChileCulturaIngestor.regionNameById[requestedRegion] ?? requestedRegion;
    const haystack = [listingItem.location, detail.region, detail.address]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();

    return haystack.includes(expectedRegionName.toLowerCase());
  }

  private buildEventCandidate(
    listingItem: ChileCulturaListingItem,
    detail: ChileCulturaDetail,
  ): { candidate: EventCandidate; snippets: RawSnippets } {
    const startAt = parseChileCulturaStartAt(
      listingItem.dateText,
      detail.timeText,
    );
    const venueName = detail.venueName ?? listingItem.location;
    const city =
      detail.region?.includes("Metropolitana") ||
      listingItem.location.includes("Metropolitana")
        ? this.defaultCity
        : "Sin ciudad informada";
    const commune = this.unknownCommune;

    const candidate: EventCandidate = {
      source: "chile_cultura",
      sourceType: SourceType.editorial,
      sourceUrl: listingItem.sourceUrl,
      sourceEventId: listingItem.sourceEventId,
      ticketUrl: detail.externalUrl,
      rawTitle: listingItem.title,
      title: detail.title,
      summary: this.inferSummary(detail.description),
      description: detail.description,
      imageUrl: listingItem.imageUrl,
      dateText: listingItem.dateText,
      startAtIso: startAt.toISOString(),
      venueName,
      venueRaw: venueName,
      address: detail.address,
      commune,
      city,
      region: detail.region,
      isFree: listingItem.isFree,
      categoryPrimary: this.mapCategory(listingItem.categoryText),
      categoryText: listingItem.categoryText,
      categoriesSource: [listingItem.categoryText],
      tags: detail.organizer ? [detail.organizer] : [],
      audience: this.mapAudience(detail.audienceText),
      audienceText: detail.audienceText,
      qualityScore: detail.description ? 80 : 60,
      needsReview: detail.region === null || detail.venueName === null,
      reviewNotes:
        detail.region === null || detail.venueName === null
          ? "Completar ubicación o venue desde fuente manual"
          : null,
      parserPayload: {
        listing: listingItem,
        detail,
      },
    };

    const detailSnip = [
      detail.description,
      detail.locationDetails.join(" "),
      venueName,
      listingItem.location,
      detail.region,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      candidate,
      snippets: {
        listing: `${listingItem.title} ${listingItem.location} ${listingItem.dateText} ${listingItem.categoryText}`,
        detail: detailSnip.slice(0, 8000),
      },
    };
  }

  async ingest({
    region,
    page = 1,
    limit,
    persist = false,
    enrichWithLlm,
  }: IngestChileCulturaOptions = {}) {
    const listingUrl = this.buildListingUrl(region, page);
    const listingHtml = await scrapeHtml(listingUrl);
    const listingItems = this.parseListingPage(listingHtml);
    const errors: IngestionError[] = [];

    const detailPages = await Promise.all(
      (region ? listingItems : listingItems.slice(0, limit)).map(
        async (item) => {
          const detailHtml = await scrapeHtml(item.sourceUrl);

          return {
            listingItem: item,
            detail: this.parseDetailPage(detailHtml),
          };
        },
      ),
    );

    const filtered = detailPages.filter(({ listingItem, detail }) =>
      this.matchesRegion(region, listingItem, detail),
    );
    const capped = filtered.slice(0, limit);

    const normalizedEvents: EventCreateInput[] = [];

    for (const { listingItem, detail } of capped) {
      const { candidate, snippets } = this.buildEventCandidate(
        listingItem,
        detail,
      );
      const { event, enrichFailed } = await finalizeIngestedEvent(
        candidate,
        snippets,
        { enrichWithLlm },
      );
      if (enrichFailed) {
        errors.push({
          stage: "enrich",
          url: candidate.sourceUrl,
          message: "OpenAI enrichment failed; stored parser-only fields",
        });
      }
      if (isPastEvent(event)) {
        continue;
      }
      normalizedEvents.push(event);
    }

    if (persist) {
      await Promise.all(normalizedEvents.map((event) => upsertEvent(event)));
    }

    return {
      source: "chile_cultura",
      region,
      page,
      listingUrl,
      count: normalizedEvents.length,
      processed: detailPages.length,
      skipped: Math.max(detailPages.length - normalizedEvents.length, 0),
      persisted: persist,
      errors,
      events: normalizedEvents,
    } satisfies IngestionResult;
  }
}

export const chileCulturaIngestor = new ChileCulturaIngestor();

export const ingestChileCultura = (options?: IngestChileCulturaOptions) =>
  chileCulturaIngestor.ingest(options);
