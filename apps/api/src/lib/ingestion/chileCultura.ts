import { load } from "cheerio";
import { CategoryPrimary, SourceType } from "../../generated/prisma/enums.js";
import { scrapeHtml } from "../brightdata.js";
import { prisma } from "../prisma.js";

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

export type IngestChileCulturaOptions = {
  region?: string;
  page?: number;
  limit?: number;
  persist?: boolean;
};

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

  private parseStartAt(dateText: string, timeText: string | null) {
    const match = dateText
      .toLowerCase()
      .match(/(?<day>\d{1,2})\s+(?<month>[a-záéíóú]+)/i);

    if (!match?.groups) {
      return new Date();
    }

    const monthMap: Record<string, number> = {
      ene: 0,
      enero: 0,
      feb: 1,
      febrero: 1,
      mar: 2,
      marzo: 2,
      abr: 3,
      abril: 3,
      may: 4,
      mayo: 4,
      jun: 5,
      junio: 5,
      jul: 6,
      julio: 6,
      ago: 7,
      agosto: 7,
      sep: 8,
      sept: 8,
      septiembre: 8,
      oct: 9,
      octubre: 9,
      nov: 10,
      noviembre: 10,
      dic: 11,
      diciembre: 11,
    };

    const year = new Date().getFullYear();
    const month = monthMap[match.groups.month];
    const day = Number(match.groups.day);

    const timeMatch = timeText?.match(/(?<hours>\d{1,2}):(?<minutes>\d{2})/);
    const hours = timeMatch?.groups?.hours ?? "00";
    const minutes = timeMatch?.groups?.minutes ?? "00";

    const parsedDate = new Date(
      Date.UTC(year, month ?? 0, day, Number(hours) + 3, Number(minutes)),
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return new Date();
    }

    return parsedDate;
  }

  private buildDedupeKey(title: string, venueName: string, startAt: Date) {
    return [title, venueName, startAt.toISOString().slice(0, 10)]
      .map((part) =>
        part
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      )
      .join("__");
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

  private normalizeEvent(
    listingItem: ChileCulturaListingItem,
    detail: ChileCulturaDetail,
  ) {
    const startAt = this.parseStartAt(listingItem.dateText, detail.timeText);
    const venueName = detail.venueName ?? listingItem.location;
    const city =
      detail.region?.includes("Metropolitana") ||
      listingItem.location.includes("Metropolitana")
        ? this.defaultCity
        : "Sin ciudad informada";
    const commune = this.unknownCommune;

    return {
      source: "chile_cultura",
      sourceType: SourceType.editorial,
      sourceEventId: listingItem.sourceEventId,
      sourceUrl: listingItem.sourceUrl,
      ticketUrl: detail.externalUrl,
      rawTitle: listingItem.title,
      rawPayload: {
        listing: listingItem,
        detail,
      },
      title: detail.title,
      summary: this.inferSummary(detail.description),
      description: detail.description,
      imageUrl: listingItem.imageUrl,
      startAt,
      timezone: "America/Santiago",
      dateText: listingItem.dateText,
      venueName,
      venueRaw: venueName,
      address: detail.address,
      commune,
      city,
      region: detail.region,
      isFree: listingItem.isFree,
      categoryPrimary: this.mapCategory(listingItem.categoryText),
      categorySecondary: null,
      categoriesSource: [listingItem.categoryText],
      tags: detail.organizer ? [detail.organizer] : [],
      audience: this.mapAudience(detail.audienceText),
      editorialLabels: listingItem.isFree ? ["gratis"] : [],
      dedupeKey: this.buildDedupeKey(detail.title, venueName, startAt),
      qualityScore: detail.description ? 80 : 60,
      needsReview: detail.region === null || detail.venueName === null,
      reviewNotes:
        detail.region === null || detail.venueName === null
          ? "Completar ubicación o venue desde fuente manual"
          : null,
    };
  }

  private async upsertEvent(
    event: ReturnType<ChileCulturaIngestor["normalizeEvent"]>,
  ) {
    return prisma.event.upsert({
      where: {
        source_sourceUrl: {
          source: event.source,
          sourceUrl: event.sourceUrl,
        },
      },
      create: event,
      update: {
        ...event,
        lastSeenAt: new Date(),
      },
    });
  }

  async ingest({
    region,
    page = 1,
    limit,
    persist = false,
  }: IngestChileCulturaOptions = {}) {
    const listingUrl = this.buildListingUrl(region, page);
    const listingHtml = await scrapeHtml(listingUrl);
    const listingItems = this.parseListingPage(listingHtml);

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

    const normalizedEvents = detailPages
      .filter(({ listingItem, detail }) =>
        this.matchesRegion(region, listingItem, detail),
      )
      .map(({ listingItem, detail }) =>
        this.normalizeEvent(listingItem, detail),
      )
      .slice(0, limit);

    if (persist) {
      await Promise.all(
        normalizedEvents.map((event) => this.upsertEvent(event)),
      );
    }

    return {
      source: "chile_cultura",
      region,
      page,
      listingUrl,
      count: normalizedEvents.length,
      persisted: persist,
      events: normalizedEvents,
    };
  }
}

export const chileCulturaIngestor = new ChileCulturaIngestor();

export const ingestChileCultura = (options?: IngestChileCulturaOptions) =>
  chileCulturaIngestor.ingest(options);
