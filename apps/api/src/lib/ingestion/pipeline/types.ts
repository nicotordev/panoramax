import { z } from "zod";
import {
  Audience,
  CategoryPrimary,
  SourceType,
} from "../../../generated/prisma/enums.js";

const sourceTypeZ = z.enum([
  SourceType.editorial,
  SourceType.venue,
  SourceType.ticketing,
  SourceType.organizer,
]);

const categoryPrimaryZ = z.enum([
  CategoryPrimary.music,
  CategoryPrimary.theatre,
  CategoryPrimary.standup,
  CategoryPrimary.dance,
  CategoryPrimary.festival,
  CategoryPrimary.fair,
  CategoryPrimary.exhibition,
  CategoryPrimary.food_drink,
  CategoryPrimary.family,
  CategoryPrimary.sports,
  CategoryPrimary.workshop,
  CategoryPrimary.special_experience,
]);

const audienceZ = z.enum([
  Audience.adult,
  Audience.family,
  Audience.kids,
  Audience.all_ages,
]);

const ticketTierSchema = z.object({
  name: z.string().min(1),
  price: z.number().nullable().optional(),
  fee: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  currency: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  rawText: z.string().nullable().optional(),
});

/** Parser output: partial event fields + optional location overrides (e.g. Chile Cultura). */
export const eventCandidateSchema = z.object({
  source: z.string().min(1),
  sourceType: sourceTypeZ,
  sourceUrl: z.string().min(1),
  sourceEventId: z.string().nullable().optional(),
  ticketUrl: z.string().nullable().optional(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  dateText: z.string().nullable().optional(),
  /** When the parser already resolved a single instant (e.g. Chile Cultura). */
  startAtIso: z.string().nullable().optional(),
  endAtIso: z.string().nullable().optional(),
  allDay: z.boolean().nullable().optional(),
  venueName: z.string().min(1),
  venueRaw: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  categoryText: z.string().nullable().optional(),
  categoryPrimary: categoryPrimaryZ.nullable().optional(),
  categorySecondary: z.string().nullable().optional(),
  categoriesSource: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  audience: audienceZ.nullable().optional(),
  audienceText: z.string().nullable().optional(),
  isFree: z.boolean().optional(),
  priceText: z.string().nullable().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  tiers: z.array(ticketTierSchema).optional(),
  locationNotes: z.string().nullable().optional(),
  rawTitle: z.string().nullable().optional(),
  qualityScore: z.number().optional(),
  needsReview: z.boolean().optional(),
  reviewNotes: z.string().nullable().optional(),
  /** Arbitrary structured parser context merged into rawPayload.ingestionPipeline.parser */
  parserPayload: z.record(z.string(), z.unknown()).optional(),
  ambiguousFields: z.array(z.string()).optional(),
});

export type EventCandidate = z.infer<typeof eventCandidateSchema>;

const snippetEntry = z.string().max(8000);

export const rawSnippetsSchema = z
  .object({
    listing: snippetEntry.optional(),
    detail: snippetEntry.optional(),
    pricing: snippetEntry.optional(),
  })
  .strict();

export type RawSnippets = z.infer<typeof rawSnippetsSchema>;

/** LLM output: optional refinements; URLs and source ids are never taken from here. */
export const llmEnrichmentPatchSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  summary: z.string().optional(),
  /** Null clears a parser placeholder so the public page does not show scraped chrome. */
  description: z.union([z.string(), z.null()]).optional(),
  venueName: z.string().optional(),
  address: z.string().optional(),
  categoryPrimary: categoryPrimaryZ.optional(),
  categorySecondary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  locationNotes: z.string().optional(),
  reviewNotes: z.string().optional(),
  needsReview: z.boolean().optional(),
  audience: audienceZ.optional(),
  /** Only applied when the candidate has no dateText yet. */
  dateText: z.string().optional(),
  qualityScore: z.number().optional(),
  tiers: z.array(ticketTierSchema).optional(),
});

export type LlmEnrichmentPatch = z.infer<typeof llmEnrichmentPatchSchema>;

export const CANDIDATE_VERSION = 1 as const;

export function truncateSnippet(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}…`;
}

export function clampRawSnippets(snippets: RawSnippets): RawSnippets {
  const out: RawSnippets = {};
  if (snippets.listing !== undefined) {
    out.listing = truncateSnippet(snippets.listing, 6000);
  }
  if (snippets.detail !== undefined) {
    out.detail = truncateSnippet(snippets.detail, 8000);
  }
  if (snippets.pricing !== undefined) {
    out.pricing = truncateSnippet(snippets.pricing, 4000);
  }
  return out;
}
