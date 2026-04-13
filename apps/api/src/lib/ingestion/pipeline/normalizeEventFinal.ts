import type { EventCreateInput } from "../../validation/events.schema.js";
import {
  defaultEvent,
  inferLocation,
  mapAudience,
  mapCategory,
  parseSpanishDateRange,
} from "../core/shared.js";
import type { EventCandidate } from "./types.js";
import { CANDIDATE_VERSION } from "./types.js";

export type NormalizeEventFinalMeta = {
  llmModel?: string;
  enrichedAt?: string;
};

export function normalizeEventFinal(
  candidate: EventCandidate,
  meta?: NormalizeEventFinalMeta,
): EventCreateInput {
  let startAt: Date;
  let endAt: Date | null;
  let allDay: boolean;

  if (candidate.startAtIso) {
    startAt = new Date(candidate.startAtIso);
    if (Number.isNaN(startAt.getTime())) {
      const dr = parseSpanishDateRange(candidate.dateText);
      startAt = dr.startAt;
      endAt = dr.endAt;
      allDay = dr.allDay;
    } else {
      endAt = candidate.endAtIso ? new Date(candidate.endAtIso) : null;
      if (endAt && Number.isNaN(endAt.getTime())) {
        endAt = null;
      }
      allDay = candidate.allDay ?? false;
    }
  } else {
    const dr = parseSpanishDateRange(candidate.dateText);
    startAt = dr.startAt;
    endAt = dr.endAt;
    allDay = dr.allDay;
  }

  const inferred = inferLocation(candidate.address ?? candidate.venueName);
  const commune = candidate.commune ?? inferred.commune;
  const city =
    candidate.city ??
    (commune !== "Sin comuna informada" ? "Santiago" : inferred.city);
  const region = candidate.region ?? inferred.region;

  const categoryPrimary =
    candidate.categoryPrimary ?? mapCategory(candidate.categoryText ?? null);
  const audience =
    candidate.audience ??
    (candidate.audienceText ? mapAudience(candidate.audienceText) : null);

  const ingestionPipeline: Record<string, unknown> = {
    candidateVersion: CANDIDATE_VERSION,
  };
  if (meta?.llmModel) {
    ingestionPipeline.llmModel = meta.llmModel;
  }
  if (meta?.enrichedAt) {
    ingestionPipeline.enrichedAt = meta.enrichedAt;
  }

  const parserPayload = candidate.parserPayload ?? {};
  const rawPayload = {
    ...parserPayload,
    ingestionPipeline,
  } as EventCreateInput["rawPayload"];

  return defaultEvent({
    source: candidate.source,
    sourceType: candidate.sourceType,
    sourceUrl: candidate.sourceUrl,
    sourceEventId: candidate.sourceEventId ?? null,
    rawTitle: candidate.rawTitle ?? null,
    title: candidate.title,
    subtitle: candidate.subtitle ?? null,
    description: candidate.description ?? null,
    summary: candidate.summary ?? null,
    imageUrl: candidate.imageUrl ?? null,
    dateText: candidate.dateText ?? null,
    startAt,
    endAt,
    allDay,
    venueName: candidate.venueName,
    venueRaw: candidate.venueRaw ?? candidate.venueName,
    address: candidate.address ?? null,
    commune,
    city,
    region,
    isFree: candidate.isFree ?? false,
    priceText: candidate.priceText ?? null,
    priceMin: candidate.priceMin ?? null,
    priceMax: candidate.priceMax ?? null,
    tiers: candidate.tiers?.map((tier, index) => ({
      name: tier.name,
      price: tier.price ?? null,
      fee: tier.fee ?? null,
      totalPrice: tier.totalPrice ?? null,
      currency: tier.currency ?? "CLP",
      sortOrder: tier.sortOrder ?? index,
      rawText: tier.rawText ?? null,
    })),
    categoryPrimary,
    categorySecondary: candidate.categorySecondary ?? null,
    categoriesSource: candidate.categoriesSource ?? [],
    tags: candidate.tags ?? [],
    audience,
    ticketUrl: candidate.ticketUrl ?? null,
    rawPayload,
    qualityScore: candidate.qualityScore ?? 70,
    needsReview: candidate.needsReview ?? false,
    reviewNotes: candidate.reviewNotes ?? null,
    locationNotes: candidate.locationNotes ?? null,
  });
}
