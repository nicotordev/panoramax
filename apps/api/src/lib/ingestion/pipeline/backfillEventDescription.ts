import type { Prisma } from "../../../generated/prisma/client.js";
import { toPrismaJsonInput } from "../../prisma-json.js";
import { prisma } from "../../prisma.js";
import { extractBodyText } from "../core/shared.js";
import { enrichDisambiguateCandidate } from "./enrichDisambiguate.js";
import { mergeCandidateWithLlm } from "./mergeCandidateWithLlm.js";
import { scrapeDetailHtmlAndOptionalMarkdown } from "./scrapeDetailForIngest.js";
import type { EventCandidate, RawSnippets } from "./types.js";
import {
  eventCandidateSchema,
  llmEnrichmentPatchSchema,
  rawSnippetsSchema,
} from "./types.js";

export type EventWithTiersForBackfill = Prisma.EventGetPayload<{
  include: { tiers: { orderBy: { sortOrder: "asc" } } };
}>;

function toNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function categoryTextLine(event: EventWithTiersForBackfill): string | null {
  return event.categoriesSource[0]?.trim() || null;
}

export function dbEventToCandidate(
  event: EventWithTiersForBackfill,
): EventCandidate {
  const tiers = event.tiers.map((tier) => ({
    name: tier.name,
    price: toNumber(tier.price),
    fee: toNumber(tier.fee),
    totalPrice: toNumber(tier.totalPrice),
    currency: tier.currency ?? "CLP",
    sortOrder: tier.sortOrder,
    rawText: tier.rawText,
  }));

  return eventCandidateSchema.parse({
    source: event.source,
    sourceType: event.sourceType,
    sourceUrl: event.sourceUrl,
    sourceEventId: event.sourceEventId,
    ticketUrl: event.ticketUrl,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    summary: event.summary,
    imageUrl: event.imageUrl,
    dateText: event.dateText,
    startAtIso: event.startAt.toISOString(),
    endAtIso: event.endAt?.toISOString() ?? null,
    allDay: event.allDay,
    venueName: event.venueName,
    venueRaw: event.venueRaw,
    address: event.address,
    commune: event.commune,
    city: event.city,
    region: event.region,
    categoryText: categoryTextLine(event),
    categoryPrimary: event.categoryPrimary,
    categorySecondary: event.categorySecondary,
    categoriesSource: event.categoriesSource,
    tags: event.tags,
    audience: event.audience,
    isFree: event.isFree,
    priceText: event.priceText,
    priceMin: toNumber(event.priceMin),
    priceMax: toNumber(event.priceMax),
    tiers,
    locationNotes: event.locationNotes,
    needsReview: event.needsReview,
    reviewNotes: event.reviewNotes,
    qualityScore: event.qualityScore ?? undefined,
  });
}

function buildSnippetsFromRescrape(params: {
  event: EventWithTiersForBackfill;
  html: string;
  markdown?: string;
}): RawSnippets {
  const { event, html, markdown } = params;
  const text = extractBodyText(html);
  const cat = categoryTextLine(event);
  const detail = [
    `TITLE:\n${event.title}`,
    event.dateText ? `DATE:\n${event.dateText}` : null,
    `VENUE:\n${event.venueName}`,
    event.address ? `ADDRESS:\n${event.address}` : null,
    cat ? `CATEGORY:\n${cat}` : null,
    event.summary?.trim()
      ? `STORED_SUMMARY:\n${event.summary.trim().slice(0, 800)}`
      : null,
    event.description?.trim()
      ? `STORED_DESCRIPTION:\n${event.description.trim().slice(0, 2500)}`
      : null,
    `PAGE_TEXT:\n${text.slice(0, 4000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return rawSnippetsSchema.parse({
    detail,
    pricing: event.priceText ?? undefined,
    ...(markdown ? { markdown } : {}),
  });
}

function buildSnippetsDbOnly(event: EventWithTiersForBackfill): RawSnippets {
  const cat = categoryTextLine(event);
  const detail = [
    `TITLE:\n${event.title}`,
    event.dateText ? `DATE:\n${event.dateText}` : null,
    `VENUE:\n${event.venueName}`,
    event.address ? `ADDRESS:\n${event.address}` : null,
    cat ? `CATEGORY:\n${cat}` : null,
    event.summary?.trim()
      ? `STORED_SUMMARY:\n${event.summary.trim().slice(0, 800)}`
      : null,
    event.description?.trim()
      ? `STORED_DESCRIPTION:\n${event.description.trim().slice(0, 2500)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return rawSnippetsSchema.parse({
    detail,
    pricing: event.priceText ?? undefined,
  });
}

export type BackfillDescriptionResult =
  | {
      ok: true;
      id: string;
      slug: string;
      updated: boolean;
      wouldUpdate: boolean;
      scrapeFailed: boolean;
    }
  | { ok: false; id: string; slug: string; error: string };

/**
 * Re-scrapes `sourceUrl` (HTML + optional markdown via Bright Data) and runs the same
 * LLM enrichment as ingest. Updates `description`, `summary`, `needsReview`, `reviewNotes`
 * only; tier rows are not replaced (patch tiers cleared before merge).
 */
export async function backfillEventDescriptionWithLlm(
  event: EventWithTiersForBackfill,
  options?: { dryRun?: boolean },
): Promise<BackfillDescriptionResult> {
  const dryRun = options?.dryRun ?? false;

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      id: event.id,
      slug: event.slug,
      error: "OPENAI_API_KEY is not set",
    };
  }

  if (!/^https?:\/\//i.test(event.sourceUrl)) {
    return {
      ok: false,
      id: event.id,
      slug: event.slug,
      error: "sourceUrl is not an http(s) URL; cannot rescrape",
    };
  }

  const candidate = dbEventToCandidate(event);
  let scrapeFailed = false;
  let snippets: RawSnippets;

  try {
    const { html, markdown } = await scrapeDetailHtmlAndOptionalMarkdown(
      event.sourceUrl,
      true,
    );
    snippets = buildSnippetsFromRescrape({ event, html, markdown });
  } catch {
    scrapeFailed = true;
    snippets = buildSnippetsDbOnly(event);
  }

  let patch;
  try {
    patch = await enrichDisambiguateCandidate(candidate, snippets);
  } catch (error) {
    return {
      ok: false,
      id: event.id,
      slug: event.slug,
      error:
        error instanceof Error ? error.message : "OpenAI enrichment failed",
    };
  }

  if (!patch || Object.keys(patch).length === 0) {
    return {
      ok: true,
      id: event.id,
      slug: event.slug,
      updated: false,
      wouldUpdate: false,
      scrapeFailed,
    };
  }

  const normalizedPatch = llmEnrichmentPatchSchema.parse(patch);
  const merged = mergeCandidateWithLlm(candidate, {
    ...normalizedPatch,
    tiers: [],
  });

  const descChanged =
    (merged.description ?? null) !== (event.description ?? null);
  const sumChanged = (merged.summary ?? null) !== (event.summary ?? null);
  const reviewChanged =
    merged.needsReview !== event.needsReview ||
    (merged.reviewNotes ?? null) !== (event.reviewNotes ?? null);
  const wouldUpdate = descChanged || sumChanged || reviewChanged;

  if (!wouldUpdate) {
    return {
      ok: true,
      id: event.id,
      slug: event.slug,
      updated: false,
      wouldUpdate: false,
      scrapeFailed,
    };
  }

  if (dryRun) {
    return {
      ok: true,
      id: event.id,
      slug: event.slug,
      updated: false,
      wouldUpdate: true,
      scrapeFailed,
    };
  }

  const prevRaw =
    event.rawPayload &&
    typeof event.rawPayload === "object" &&
    !Array.isArray(event.rawPayload)
      ? (event.rawPayload as Record<string, unknown>)
      : {};
  const prevPipeline =
    typeof prevRaw.ingestionPipeline === "object" &&
    prevRaw.ingestionPipeline !== null &&
    !Array.isArray(prevRaw.ingestionPipeline)
      ? (prevRaw.ingestionPipeline as Record<string, unknown>)
      : {};

  const nextRawPayload = {
    ...prevRaw,
    ingestionPipeline: {
      ...prevPipeline,
      descriptionBackfillAt: new Date().toISOString(),
      descriptionBackfillModel:
        process.env.OPENAI_INGEST_MODEL ?? "gpt-5.4-mini",
      descriptionBackfillScrapeFailed: scrapeFailed,
    },
  };

  await prisma.event.update({
    where: { id: event.id },
    data: {
      description: merged.description ?? null,
      summary: merged.summary ?? null,
      needsReview: merged.needsReview,
      reviewNotes: merged.reviewNotes ?? null,
      rawPayload: toPrismaJsonInput(nextRawPayload),
    },
  });

  return {
    ok: true,
    id: event.id,
    slug: event.slug,
    updated: true,
    wouldUpdate: true,
    scrapeFailed,
  };
}
