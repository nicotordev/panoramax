import type { EventCandidate, LlmEnrichmentPatch } from "./types.js";

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
    description: patch.description?.trim()
      ? patch.description.trim()
      : candidate.description,
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
        ? patch.reviewNotes
        : candidate.reviewNotes,
    needsReview: candidate.needsReview || Boolean(patch.needsReview === true),
    audience: patch.audience ?? candidate.audience,
    qualityScore:
      patch.qualityScore !== undefined
        ? patch.qualityScore
        : candidate.qualityScore,
  };
}
