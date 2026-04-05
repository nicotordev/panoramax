import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
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
- Never invent dates, times, URLs, ticket links, sectors, tiers, or prices not clearly implied by the snippets.
- Ignore website chrome and UI boilerplate such as login text, cookies, category menus, "compra tu entrada", "ver más", "produce", account widgets, and navigation labels.
- Prefer fixing messy titles, venue names, descriptions, and short Spanish summaries.
- If snippets contain ticket tiers, return them as structured tiers in the same order they appear.
- For ticket tiers, prefer one tier per visible sector, preventa, general, VIP, visita, etc. line.
- For Chilean ticketing pages, use currency "CLP" when prices are shown as "$" or "CLP" and no other currency is stated.
- Only set price, fee, and totalPrice when each value is explicitly supported by the snippets.
- If the candidate description or summary looks polluted by boilerplate, replace it only when the snippets contain real editorial event text.
- categoryPrimary must be one of the allowed enum strings if you set it.
- audience must be one of the allowed enum strings if you set it.
- If information is ambiguous, set needsReview to true and a short Spanish reviewNotes.
- dateText: only fill when the candidate's dateText is empty and the snippets contain a clear date phrase.`;

const pricingPrompt = `You extract structured ticket tiers from Chilean event pricing text in Spanish.
Return ONLY a JSON object matching the schema.
Rules:
- Extract one tier per visible line or label such as Preventa 1, Preventa 2, General, VIP, Andes, Pacífico, Visita.
- Preserve the original order.
- Use currency "CLP" when prices are shown as "$" or "CLP" and no other currency is stated.
- If a line only shows one value, put it in "price" and leave fee/totalPrice null or omitted.
- If a line clearly shows subtotal, fee, and total, map them to price, fee, and totalPrice.
- Do not invent tiers, split bundles, or infer fees.
- If the pricing text does not contain tiers, return an empty tiers array.`;

const pricingOnlySchema = z.object({
  tiers: z.array(
    z.object({
      name: z.string().min(1),
      price: z.number().nullable().optional(),
      fee: z.number().nullable().optional(),
      totalPrice: z.number().nullable().optional(),
      currency: z.string().optional(),
      sortOrder: z.number().int().nonnegative().optional(),
      rawText: z.string().nullable().optional(),
    }),
  ),
});

async function extractPricingTiers(
  client: OpenAI,
  model: string,
  candidate: EventCandidate,
  pricingText: string,
) {
  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: pricingPrompt },
      {
        role: "user",
        content: JSON.stringify({
          title: candidate.title,
          source: candidate.source,
          pricing: pricingText,
        }),
      },
    ],
    response_format: zodResponseFormat(pricingOnlySchema, "pricing_tiers"),
    temperature: 0,
  });

  return completion.choices[0]?.message.parsed?.tiers ?? [];
}

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

  const parsed = completion.choices[0]?.message.parsed ?? null;
  if (
    parsed &&
    (!parsed.tiers || parsed.tiers.length === 0) &&
    safeSnippets.pricing?.trim()
  ) {
    const tiers = await extractPricingTiers(
      client,
      model,
      candidate,
      safeSnippets.pricing,
    );
    if (tiers.length > 0) {
      return {
        ...parsed,
        tiers,
      };
    }
  }

  if (!parsed && safeSnippets.pricing?.trim()) {
    const tiers = await extractPricingTiers(
      client,
      model,
      candidate,
      safeSnippets.pricing,
    );
    if (tiers.length > 0) {
      return { tiers };
    }
  }

  return parsed;
}
