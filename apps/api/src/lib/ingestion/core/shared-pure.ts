import { createHash } from "node:crypto";
import { load } from "cheerio";
import {
  Audience,
  CategoryType,
  SourceType,
} from "../../../generated/prisma/enums.js";
import type {
  EventCreateInput,
  EventTierInput,
} from "../../validation/events.schema.js";
import {
  SPANISH_DATE_DETAILS_REGEX,
  SPANISH_MONTH_TOKEN_TO_INDEX,
} from "./parsing-constants.js";
import {
  inferRegionFromTextHints,
  matchCommuneInText,
  METRO_REGION,
  resolveOfficialCommuneByName,
} from "./chileCommunes.js";

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
  /**
   * HTML fetch (e.g. local Playwright). When omitted, ingest scripts use Bright Data
   * via a lazy import in each source that supports it.
   */
  fetchHtml?: (url: string) => Promise<string>;
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

export type IngestSkipReason =
  | "missing_date"
  | "not_event"
  | "past_event"
  | "polluted"
  | "detail_error"
  | "persist_error"
  | "other";

export type IngestSkipCounts = Partial<Record<IngestSkipReason, number>>;

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
  /** Aggregated skip reasons (listing/detail/normalize loops). */
  skipCounts?: IngestSkipCounts;
};

const UNKNOWN_COMMUNE = "Sin comuna informada";
const UNKNOWN_CITY = "Sin ciudad informada";

export function recordSkip(
  counts: IngestSkipCounts | undefined,
  reason: IngestSkipReason,
): IngestSkipCounts {
  return { ...counts, [reason]: (counts?.[reason] ?? 0) + 1 };
}

type DateRangeResult = {
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
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

export const extractImageUrl = ($el: any) => {
  if (!$el) return null;

  const attributes = [
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-img-url",
    "data-src-retina",
    "src",
  ];

  for (const attr of attributes) {
    const val = typeof $el.attr === "function" ? $el.attr(attr) : null;
    if (val && !val.startsWith("data:image/")) {
      return val;
    }
  }

  return (typeof $el.attr === "function" ? $el.attr("src") : null) || null;
};

export const extractBodyText = (html: string) => {
  const $ = load(html);

  $("script, style, noscript, template").remove();

  return $("body").text().replace(/\s+/g, " ").trim();
};

/** Prefer structured paragraphs; fall back to full body text (noisier). */
export const getMeaningfulParagraphs = (
  html: string,
  selectors = [
    "article p",
    "main p",
    ".entry-content p",
    ".post-content p",
    ".single-content p",
  ],
) => {
  const $ = load(html);
  $("script, style, noscript, template, nav, footer, header").remove();
  for (const sel of selectors) {
    const parts = $(sel)
      .toArray()
      .map((node) => $(node).text().replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 48);
    if (parts.length > 0) {
      return parts.slice(0, 8).join("\n\n");
    }
  }
  return extractBodyText(html);
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

function looksLikeHumanSlug(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return /[a-z]/i.test(trimmed) && !/^\d+$/.test(trimmed);
}

export function buildEventSlug({
  title,
  source,
  sourceEventId,
  sourceUrl,
}: {
  title: string;
  source: string;
  sourceEventId?: string | null;
  sourceUrl: string;
}) {
  const base =
    slugify(looksLikeHumanSlug(sourceEventId) ? sourceEventId : title) || "evento";
  const suffix = createHash("sha256")
    .update(`${source}:${sourceEventId ?? sourceUrl}`)
    .digest("hex")
    .slice(0, 8);

  return `${base}-${suffix}`;
}

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
    return CategoryType.theatre;
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
    return CategoryType.music;
  }

  if (haystack.includes("stand up") || haystack.includes("humor")) {
    return CategoryType.standup;
  }

  if (haystack.includes("danza") || haystack.includes("ballet")) {
    return CategoryType.dance;
  }

  if (haystack.includes("festival")) {
    return CategoryType.festival;
  }

  if (haystack.includes("feria")) {
    return CategoryType.fair;
  }

  if (haystack.includes("expo") || haystack.includes("visual")) {
    return CategoryType.exhibition;
  }

  if (haystack.includes("famil") || haystack.includes("infantil")) {
    return CategoryType.family;
  }

  if (haystack.includes("futbol") || haystack.includes("deporte")) {
    return CategoryType.sports;
  }

  if (haystack.includes("taller") || haystack.includes("laboratorio")) {
    return CategoryType.workshop;
  }

  if (haystack.includes("gastr")) {
    return CategoryType.food_drink;
  }

  return CategoryType.special_experience;
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
  const parsedMonth =
    SPANISH_MONTH_TOKEN_TO_INDEX[stripAccents(month.toLowerCase())];
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

  const finalize = (commune: string, region: string) => ({
    commune,
    city: region === METRO_REGION ? "Santiago" : commune,
    region,
  });

  const communeFromVenue = inferVenueCommune(normalized);
  if (communeFromVenue) {
    const resolved = resolveOfficialCommuneByName(communeFromVenue);
    if (resolved) {
      return finalize(resolved.commune, resolved.region);
    }
  }

  const fromIneSubstring = matchCommuneInText(normalized);
  if (fromIneSubstring) {
    return finalize(fromIneSubstring.commune, fromIneSubstring.region);
  }

  const aliasHit = communeAliases.find((candidate) =>
    lower.includes(stripAccents(candidate.toLowerCase())),
  );
  if (aliasHit) {
    const resolved = resolveOfficialCommuneByName(aliasHit);
    if (resolved) {
      return finalize(resolved.commune, resolved.region);
    }
  }

  const hint = inferRegionFromTextHints(normalized);
  if (hint) {
    return {
      commune: UNKNOWN_COMMUNE,
      city: UNKNOWN_CITY,
      region: hint,
    };
  }

  if (
    lower.includes("metropolitana") ||
    /\bgran santiago\b/i.test(normalized) ||
    /\brm\b/.test(lower)
  ) {
    return {
      commune: UNKNOWN_COMMUNE,
      city: "Santiago",
      region: METRO_REGION,
    };
  }

  return {
    commune: UNKNOWN_COMMUNE,
    city: UNKNOWN_CITY,
    region: null,
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
  categoryPrimary: CategoryType;
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
  const slug = buildEventSlug({
    title,
    source,
    sourceEventId,
    sourceUrl,
  });

  return {
    source,
    sourceType,
    sourceEventId: sourceEventId ?? null,
    sourceUrl,
    slug,
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
