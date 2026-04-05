import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type {
  EventCandidate,
  LlmEnrichmentPatch,
  RawSnippets,
} from "./types.js";
import { clampRawSnippets, llmEnrichmentPatchSchema } from "./types.js";

const systemPrompt = `You help normalize scraped cultural events in Chile (Spanish).
You receive a JSON "candidate" from an HTML parser plus text "snippets" from the page.
Return a JSON object with ONLY fields you can support using those snippets. Omit keys you cannot improve.
Rules:
- Never invent dates, times, URLs, ticket links, or prices not clearly implied by the snippets.
- If snippets contain ticket tiers, return them as structured tiers with name and any clearly supported price, fee, and totalPrice.
- Prefer fixing messy titles, venue names, descriptions, and short Spanish summaries.
- categoryPrimary must be one of the allowed enum strings if you set it.
- audience must be one of the allowed enum strings if you set it.
- If information is ambiguous, set needsReview to true and a short Spanish reviewNotes.
- dateText: only fill when the candidate's dateText is empty and the snippets contain a clear date phrase.`;

export async function enrichDisambiguateCandidate(
  candidate: EventCandidate,
  snippets: RawSnippets,
): Promise<LlmEnrichmentPatch | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_INGEST_MODEL ?? "gpt-5.4-mini";

  const { parserPayload: _drop, ...slimCandidate } = candidate;
  const safeSnippets = clampRawSnippets(snippets);

  const userContent = JSON.stringify({
    candidate: slimCandidate,
    snippets: safeSnippets,
  });

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: zodResponseFormat(
      llmEnrichmentPatchSchema,
      "event_enrichment_patch",
    ),
    temperature: 0.2,
  });

  const parsed = completion.choices[0]?.message.parsed;
  return parsed ?? null;
}
