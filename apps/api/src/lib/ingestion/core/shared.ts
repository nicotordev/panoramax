import { load } from "cheerio";
import {
  Audience,
  CategoryPrimary,
  SourceType,
} from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { scrapeHtml } from "../../brightdata.js";
import { prisma } from "../../prisma.js";
import { toPrismaJsonInput } from "../../prisma-json.js";
import type {
  EventCreateInput,
  EventTierInput,
} from "../../validation/events.schema.js";

export type IngestSourceOptions = {
  page?: number;
  limit?: number;
  persist?: boolean;
  /** Only `chile-cultura` reads this; other sources ignore it. */
  region?: string;
  /**
   * When `true`, run OpenAI enrichment if `OPENAI_API_KEY` is set.
   * When `false`, skip.
   * When omitted, run enrichment automatically whenever `OPENAI_API_KEY` is set.
   */
  enrichWithLlm?: boolean;
};

export type IngestionErrorStage =
  | "listing"
  | "detail"
  | "normalize"
  | "enrich"
  | "persist";

export type IngestionError = {
  stage: IngestionErrorStage;
  message: string;
  url?: string;
};

export type IngestionResult = {
  source: string;
  listingUrl: string;
  page: number;
  count: number;
  processed: number;
  skipped: number;
  persisted: boolean;
  errors: IngestionError[];
  events: EventCreateInput[];
  /** Present for region-scraped sources (e.g. Chile Cultura). */
  region?: string;
};

type DateRangeResult = {
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
};

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

const communeAliases = [
  "Estación Central",
  "Santiago Centro",
  "Santiago",
  "Providencia",
  "Ñuñoa",
  "Recoleta",
  "Las Condes",
  "La Reina",
  "Lo Barnechea",
  "Huechuraba",
  "Independencia",
  "Maipú",
  "La Florida",
  "Vitacura",
  "Quinta Normal",
  "Cerrillos",
  "Pudahuel",
];

const venueAliases = [
  {
    match: ["movistar arena"],
    canonicalName: "Movistar Arena",
    commune: "Santiago Centro",
  },
  {
    match: ["teatro caupolican", "caupolican"],
    canonicalName: "Teatro Caupolicán",
    commune: "Santiago Centro",
  },
  {
    match: ["teatro coliseo", "coliseo"],
    canonicalName: "Teatro Coliseo",
    commune: "Santiago Centro",
  },
  {
    match: ["club chocolate"],
    canonicalName: "Club Chocolate",
    commune: "Recoleta",
  },
  {
    match: ["estadio santa laura"],
    canonicalName: "Estadio Santa Laura",
    commune: "Independencia",
  },
  {
    match: ["espacio riesgo", "espacio riesco"],
    canonicalName: "Espacio Riesco",
    commune: "Huechuraba",
  },
  {
    match: ["matucana 100", "m100"],
    canonicalName: "Matucana 100",
    commune: "Estación Central",
  },
  {
    match: ["gam", "centro cultural gabriela mistral"],
    canonicalName: "Centro Cultural Gabriela Mistral",
    commune: "Santiago Centro",
  },
  {
    match: ["club subterraneo"],
    canonicalName: "Club Subterráneo",
    commune: "Providencia",
  },
  {
    match: [
      "cupula parque o'higgins",
      "cupula parque o higgins",
      "cupula multiespacio",
    ],
    canonicalName: "Cúpula Parque O'Higgins",
    commune: "Santiago Centro",
  },
  {
    match: ["teatro nescafe"],
    canonicalName: "Teatro Nescafé de las Artes",
    commune: "Providencia",
  },
];

export const normalizeText = (value: string | null | undefined) =>
  value?.replace(/\s+/g, " ").trim() || null;

export const extractBodyText = (html: string) => {
  const $ = load(html);

  $("script, style, noscript, template").remove();

  return $("body").text().replace(/\s+/g, " ").trim();
};

export const absoluteUrl = (baseUrl: string, pathOrUrl: string) =>
  new URL(pathOrUrl, baseUrl).toString();

export const slugFromUrl = (url: string) => {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);

  return segments.at(-1) ?? pathname;
};

export const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "");

export const slugify = (value: string) =>
  stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const inferSummary = (description: string | null) => {
  if (!description) {
    return null;
  }

  const [firstSentence] = description.split(/(?<=[.!?])\s+/);

  return firstSentence?.slice(0, 280) ?? description.slice(0, 280);
};

export const mapCategory = (value: string | null | undefined) => {
  const haystack = stripAccents((value ?? "").toLowerCase());

  if (
    haystack.includes("teatro") ||
    haystack.includes("opera") ||
    haystack.includes("musical")
  ) {
    return CategoryPrimary.theatre;
  }

  if (
    haystack.includes("musica") ||
    haystack.includes("rock") ||
    haystack.includes("pop") ||
    haystack.includes("metal") ||
    haystack.includes("funk") ||
    haystack.includes("reggaeton") ||
    haystack.includes("salsa") ||
    haystack.includes("folklore")
  ) {
    return CategoryPrimary.music;
  }

  if (haystack.includes("stand up") || haystack.includes("humor")) {
    return CategoryPrimary.standup;
  }

  if (haystack.includes("danza") || haystack.includes("ballet")) {
    return CategoryPrimary.dance;
  }

  if (haystack.includes("festival")) {
    return CategoryPrimary.festival;
  }

  if (haystack.includes("feria")) {
    return CategoryPrimary.fair;
  }

  if (haystack.includes("expo") || haystack.includes("visual")) {
    return CategoryPrimary.exhibition;
  }

  if (haystack.includes("famil") || haystack.includes("infantil")) {
    return CategoryPrimary.family;
  }

  if (haystack.includes("futbol") || haystack.includes("deporte")) {
    return CategoryPrimary.sports;
  }

  if (haystack.includes("taller") || haystack.includes("laboratorio")) {
    return CategoryPrimary.workshop;
  }

  if (haystack.includes("gastr")) {
    return CategoryPrimary.food_drink;
  }

  return CategoryPrimary.special_experience;
};

export const mapAudience = (value: string | null | undefined) => {
  const haystack = stripAccents((value ?? "").toLowerCase());

  if (!haystack) {
    return null;
  }

  if (haystack.includes("todo publico") || haystack.includes("all ages")) {
    return Audience.all_ages;
  }

  if (haystack.includes("famil")) {
    return Audience.family;
  }

  if (haystack.includes("infantil") || haystack.includes("nino")) {
    return Audience.kids;
  }

  if (haystack.includes("18+") || haystack.includes("adult")) {
    return Audience.adult;
  }

  return null;
};

const parseSingleDate = (
  day: string,
  month: string,
  year: string | undefined,
  hours: string | undefined,
  minutes: string | undefined,
) => {
  const currentYear = new Date().getFullYear();
  const parsedYear = year ? Number(year) : currentYear;
  const parsedMonth = monthMap[stripAccents(month.toLowerCase())];
  const parsedDay = Number(day);
  const parsedHours = Number(hours ?? "0");
  const parsedMinutes = Number(minutes ?? "0");

  if (parsedMonth === undefined || Number.isNaN(parsedDay)) {
    return null;
  }

  return new Date(
    Date.UTC(
      parsedYear,
      parsedMonth,
      parsedDay,
      parsedHours + 3,
      parsedMinutes,
    ),
  );
};

const dateRegex =
  /(?<day>\d{1,2})\s*(?:de)?\s*(?<month>ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)(?:\s*(?:de)?\s*(?<year>20\d{2}))?(?:[^\d]{1,10}(?<hours>\d{1,2})[:.](?<minutes>\d{2}))?/giu;

export const parseSpanishDateRange = (value: string | null | undefined) => {
  const fallback = new Date();
  const matches = [...(value ?? "").matchAll(dateRegex)];

  if (matches.length === 0) {
    return {
      startAt: fallback,
      endAt: null,
      allDay: true,
    } satisfies DateRangeResult;
  }

  const first = matches[0]?.groups;
  const second = matches[1]?.groups;
  const startAt =
    parseSingleDate(
      first?.day ?? "",
      first?.month ?? "",
      first?.year,
      first?.hours,
      first?.minutes,
    ) ?? fallback;
  const endAt = second
    ? parseSingleDate(
        second.day ?? "",
        second.month ?? "",
        second.year ?? first?.year,
        second.hours,
        second.minutes,
      )
    : null;
  const allDay = !first?.hours;

  return {
    startAt,
    endAt,
    allDay,
  } satisfies DateRangeResult;
};

export const parsePriceRange = (value: string | null | undefined) => {
  const normalized = value ?? "";
  const isFree = /gratis|liberad[oa]|sin costo/i.test(normalized);
  const prices = [...normalized.matchAll(/\$\s*([\d.]+)/g)]
    .map((match) => Number(match[1]?.replace(/\./g, "")))
    .filter((price) => !Number.isNaN(price));

  return {
    isFree,
    priceMin: prices.length > 0 ? Math.min(...prices) : null,
    priceMax: prices.length > 0 ? Math.max(...prices) : null,
  };
};

export const normalizeVenueName = (value: string | null | undefined) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const lower = stripAccents(normalized.toLowerCase());
  const match = venueAliases.find((alias) =>
    alias.match.some((candidate) => lower.includes(candidate)),
  );

  return match?.canonicalName ?? normalized;
};

export const inferVenueCommune = (value: string | null | undefined) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const lower = stripAccents(normalized.toLowerCase());
  const match = venueAliases.find((alias) =>
    alias.match.some((candidate) => lower.includes(candidate)),
  );

  return match?.commune ?? null;
};

export const inferLocation = (value: string | null | undefined) => {
  const normalized = value ?? "";
  const lower = stripAccents(normalized.toLowerCase());
  const communeFromVenue = inferVenueCommune(normalized);
  const commune =
    communeFromVenue ??
    communeAliases.find((candidate) =>
      lower.includes(stripAccents(candidate.toLowerCase())),
    ) ??
    "Sin comuna informada";
  const city =
    commune === "Sin comuna informada" ? "Sin ciudad informada" : "Santiago";
  const region =
    lower.includes("metropolitana") || city === "Santiago"
      ? "Región Metropolitana de Santiago"
      : null;

  return {
    commune,
    city,
    region,
  };
};

export const buildEditorialLabels = ({
  isFree,
  startAt,
  needsReview,
}: {
  isFree: boolean;
  startAt: Date;
  needsReview: boolean;
}) => {
  const labels = [];
  const now = new Date();
  const startDay = startAt.toISOString().slice(0, 10);
  const nowDay = now.toISOString().slice(0, 10);
  const diffDays = Math.floor(
    (startAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (isFree) {
    labels.push("gratis");
  }

  if (startDay === nowDay) {
    labels.push("hoy");
  } else if (diffDays >= 0 && diffDays <= 7) {
    labels.push("esta_semana");
  }

  if (needsReview) {
    labels.push("review");
  }

  return labels;
};

export const buildDedupeKey = (
  title: string,
  venueName: string,
  startAt: Date,
) =>
  [title, venueName, startAt.toISOString().slice(0, 10)]
    .map(slugify)
    .join("__");

export const isPastEvent = ({
  startAt,
  endAt,
  allDay,
}: Pick<EventCreateInput, "startAt" | "endAt" | "allDay">) => {
  const now = new Date();

  if (allDay) {
    const eventDay = (endAt ?? startAt).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    return eventDay < today;
  }

  return (endAt ?? startAt).getTime() < now.getTime();
};

export const defaultEvent = ({
  source,
  sourceType,
  sourceUrl,
  sourceEventId,
  title,
  rawTitle: rawTitleInput,
  subtitle,
  description,
  summary,
  imageUrl,
  dateText,
  startAt,
  endAt,
  allDay,
  venueName,
  venueRaw,
  address,
  commune,
  city,
  region,
  isFree,
  priceText,
  priceMin,
  priceMax,
  tiers,
  categoryPrimary,
  categorySecondary,
  categoriesSource,
  tags,
  audience,
  ticketUrl,
  rawPayload,
  qualityScore,
  needsReview,
  reviewNotes,
  locationNotes,
}: {
  source: string;
  sourceType: SourceType;
  sourceUrl: string;
  sourceEventId?: string | null;
  title: string;
  rawTitle?: string | null;
  subtitle?: string | null;
  description?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
  dateText?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  venueName: string;
  venueRaw?: string | null;
  address?: string | null;
  commune: string;
  city: string;
  region?: string | null;
  isFree?: boolean;
  priceText?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  tiers?: EventTierInput[];
  categoryPrimary: CategoryPrimary;
  categorySecondary?: string | null;
  categoriesSource?: string[];
  tags?: string[];
  audience?: Audience | null;
  ticketUrl?: string | null;
  rawPayload?: EventCreateInput["rawPayload"];
  qualityScore?: number;
  needsReview?: boolean;
  reviewNotes?: string | null;
  locationNotes?: string | null;
}) => {
  const canonicalVenueName = normalizeVenueName(venueName) ?? venueName;
  const derivedNeedsReview = needsReview ?? false;

  return {
    source,
    sourceType,
    sourceEventId: sourceEventId ?? null,
    sourceUrl,
    ticketUrl: ticketUrl ?? null,
    rawTitle: rawTitleInput ?? title,
    rawPayload,
    title,
    subtitle: subtitle ?? null,
    summary: summary ?? inferSummary(description ?? null),
    description: description ?? null,
    imageUrl: imageUrl ?? null,
    startAt,
    endAt: endAt ?? null,
    timezone: "America/Santiago",
    allDay: allDay ?? false,
    status: "scheduled" as const,
    dateText: dateText ?? null,
    venueName: canonicalVenueName,
    venueRaw: venueRaw ?? venueName,
    address: address ?? null,
    commune,
    city,
    region: region ?? null,
    country: "CL",
    isOnline: false,
    isFree: isFree ?? false,
    priceMin: priceMin ?? null,
    priceMax: priceMax ?? null,
    currency: "CLP",
    priceText: priceText ?? null,
    tiers: tiers ?? [],
    categoryPrimary,
    categorySecondary: categorySecondary ?? null,
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    audience: audience ?? null,
    editorialLabels: buildEditorialLabels({
      isFree: isFree ?? false,
      startAt,
      needsReview: derivedNeedsReview,
    }),
    dedupeKey: buildDedupeKey(title, canonicalVenueName, startAt),
    qualityScore: qualityScore ?? 70,
    needsReview: derivedNeedsReview,
    reviewNotes: reviewNotes ?? null,
    locationNotes: locationNotes ?? null,
  };
};

function toEventUncheckedCreateInput(
  event: Omit<EventCreateInput, "tiers">,
): Prisma.EventUncheckedCreateInput {
  const {
    categoriesSource,
    tags,
    editorialLabels,
    rawPayload,
    ...rest
  } = event;

  return {
    ...rest,
    rawPayload: toPrismaJsonInput(rawPayload),
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    editorialLabels: editorialLabels ?? [],
  };
}

function toEventUncheckedUpdateInput(
  event: Omit<EventCreateInput, "tiers">,
): Prisma.EventUncheckedUpdateInput {
  const {
    categoriesSource,
    tags,
    editorialLabels,
    rawPayload,
    ...rest
  } = event;

  return {
    ...rest,
    rawPayload: toPrismaJsonInput(rawPayload),
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    editorialLabels: editorialLabels ?? [],
  };
}

export const upsertEvent = async (
  event: EventCreateInput & { tiers?: EventTierInput[] },
) => {
  const { tiers = [], ...eventData } = event;

  return prisma.$transaction(async (tx) => {
    const saved = await tx.event.upsert({
      where: {
        source_sourceUrl: {
          source: event.source,
          sourceUrl: event.sourceUrl,
        },
      },
      create: toEventUncheckedCreateInput(eventData),
      update: {
        ...toEventUncheckedUpdateInput(eventData),
        lastSeenAt: new Date(),
      },
    });

    await tx.eventTier.deleteMany({
      where: { eventId: saved.id },
    });

    if (tiers.length > 0) {
      await tx.eventTier.createMany({
        data: tiers.map((tier, index) => ({
          eventId: saved.id,
          name: tier.name,
          price: tier.price ?? null,
          fee: tier.fee ?? null,
          totalPrice: tier.totalPrice ?? null,
          currency: tier.currency ?? "CLP",
          sortOrder: tier.sortOrder ?? index,
          rawText: tier.rawText ?? null,
        })),
      });
    }

    return tx.event.findUniqueOrThrow({
      where: { id: saved.id },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
  });
};

export const scrapeEventPages = async (urls: string[]) =>
  Promise.all(urls.map((url) => scrapeHtml(url)));
