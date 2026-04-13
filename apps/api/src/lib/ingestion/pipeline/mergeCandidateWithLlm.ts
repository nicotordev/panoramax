import type { EventCandidate, LlmEnrichmentPatch } from "./types.js";

function mergeDescriptionField(
  base: EventCandidate["description"],
  patch: LlmEnrichmentPatch["description"],
): EventCandidate["description"] {
  if (patch === undefined) {
    return base;
  }
  if (patch === null) {
    return null;
  }
  const trimmed = patch.trim();
  return trimmed.length ? trimmed : null;
}

function mergeTags(base: string[] | undefined, extra: string[] | undefined) {
  const out = [...(base ?? [])];
  if (!extra?.length) {
    return out;
  }
  for (const t of extra) {
    const trimmed = t.trim();
    if (trimmed && !out.includes(trimmed)) {
      out.push(trimmed);
    }
  }
  return out;
}

function mergeTiers(
  base: EventCandidate["tiers"],
  extra: LlmEnrichmentPatch["tiers"],
) {
  if (!extra?.length) {
    return base;
  }

  return extra.map((tier, index) => ({
    ...tier,
    currency: tier.currency ?? "CLP",
    sortOrder: tier.sortOrder ?? index,
  }));
}

/** Deterministic merge: parser wins for ids/URLs; LLM fills or polishes text and soft fields. */
export function mergeCandidateWithLlm(
  candidate: EventCandidate,
  patch: LlmEnrichmentPatch,
): EventCandidate {
  const dateText =
    (!candidate.dateText || candidate.dateText.trim() === "") && patch.dateText
      ? patch.dateText
      : candidate.dateText;

  return {
    ...candidate,
    dateText,
    title: patch.title?.trim() ? patch.title.trim() : candidate.title,
    subtitle:
      patch.subtitle !== undefined ? patch.subtitle : candidate.subtitle,
    summary: patch.summary?.trim() ? patch.summary.trim() : candidate.summary,
    description: mergeDescriptionField(
      candidate.description,
      patch.description,
    ),
    venueName: patch.venueName?.trim()
      ? patch.venueName.trim()
      : candidate.venueName,
    address: patch.address?.trim() ? patch.address.trim() : candidate.address,
    categoryPrimary: patch.categoryPrimary ?? candidate.categoryPrimary,
    categorySecondary:
      patch.categorySecondary !== undefined
        ? patch.categorySecondary
        : candidate.categorySecondary,
    tags: mergeTags(candidate.tags, patch.tags ?? undefined),
    locationNotes: patch.locationNotes?.trim()
      ? patch.locationNotes.trim()
      : candidate.locationNotes,
    reviewNotes:
      patch.reviewNotes !== undefined
        ? patch.reviewNotes === null
          ? null
          : patch.reviewNotes.trim()
            ? patch.reviewNotes.trim()
            : null
        : candidate.reviewNotes,
    needsReview: candidate.needsReview || Boolean(patch.needsReview === true),
    audience: patch.audience ?? candidate.audience,
    qualityScore:
      patch.qualityScore !== undefined
        ? patch.qualityScore
        : candidate.qualityScore,
    tiers: mergeTiers(candidate.tiers, patch.tiers),
  };
}
