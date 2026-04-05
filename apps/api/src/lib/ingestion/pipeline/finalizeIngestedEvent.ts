import type { EventCreateInput } from "../../../generated/prisma/models/Event.js";
import { enrichDisambiguateCandidate } from "./enrichDisambiguate.js";
import { shouldRunLlmEnrichment } from "./llmEnv.js";
import { mergeCandidateWithLlm } from "./mergeCandidateWithLlm.js";
import {
  normalizeEventFinal,
  type NormalizeEventFinalMeta,
} from "./normalizeEventFinal.js";
import type { EventCandidate, RawSnippets } from "./types.js";
import { eventCandidateSchema, rawSnippetsSchema } from "./types.js";

export type FinalizeIngestedEventResult = {
  event: EventCreateInput;
  enrichFailed?: boolean;
};

/**
 * Optional LLM step, deterministic merge, then shared Prisma-ready normalization.
 */
export async function finalizeIngestedEvent(
  candidateInput: EventCandidate,
  snippetsInput: RawSnippets,
  options?: { enrichWithLlm?: boolean },
): Promise<FinalizeIngestedEventResult> {
  const candidate = eventCandidateSchema.parse(candidateInput);
  const snippets = rawSnippetsSchema.parse(snippetsInput);

  const runLlm = shouldRunLlmEnrichment(options?.enrichWithLlm);
  let merged: EventCandidate = candidate;
  const meta: NormalizeEventFinalMeta = {};

  if (runLlm) {
    try {
      const patch = await enrichDisambiguateCandidate(candidate, snippets);
      if (patch && Object.keys(patch).length > 0) {
        merged = mergeCandidateWithLlm(candidate, patch);
        meta.llmModel = process.env.OPENAI_INGEST_MODEL ?? "gpt-5.4-mini";
        meta.enrichedAt = new Date().toISOString();
      }
    } catch {
      merged = candidate;
      return {
        event: normalizeEventFinal(candidate),
        enrichFailed: true,
      };
    }
  }

  return { event: normalizeEventFinal(merged, meta) };
}
