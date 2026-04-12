import OpenAI, { APIError } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { mapCategory } from "../core/shared.js";
import type {
  EventCandidate,
  LlmEnrichmentPatch,
  RawSnippets,
} from "./types.js";
import { clampRawSnippets, llmEnrichmentPatchSchema } from "./types.js";

const systemPrompt = `You help normalize scraped cultural events in Chile (Spanish).
You receive a JSON "candidate" from an HTML parser plus text "snippets" from the page.
The snippets object may include "markdown": a Bright Data markdown extract of the same event URL (headings, lists, less layout noise than raw page text). When "markdown" is present, prefer it over long PAGE_TEXT / PAGE_TAIL blobs for editorial description and summary, while still applying all safety rules below.
Return a JSON object with ONLY fields you can support using those snippets. Omit keys you cannot improve.
Rules:
- Never invent dates, times, URLs, ticket links, sectors, tiers, or prices not clearly implied by the snippets.
- Never invent or modify slugs, source ids, canonical ids, image URLs, source URLs, or ticket URLs.
- Ignore website chrome and UI boilerplate such as login text, cookies, category menus, "compra tu entrada", "ver más", "produce", account widgets, and navigation labels.
- Prefer fixing messy titles, venue names, descriptions, and short Spanish summaries.
- If snippets contain ticket tiers, return them as structured tiers in the same order they appear.
- For ticket tiers, prefer one tier per visible sector, preventa, general, VIP, visita, etc. line.
- For Chilean ticketing pages, use currency "CLP" when prices are shown as "$" or "CLP" and no other currency is stated.
- Only set price, fee, and totalPrice when each value is explicitly supported by the snippets.
- If the candidate description or summary looks polluted by boilerplate, replace it only when the snippets contain real editorial event text.
- If candidate.description is long (>600 chars) OR contains ticketing UI junk (e.g. "País seleccionado", "Ticketplus", "add_shopping_cart", "keyboard_arrow", "COMPRAR INFO EVENTO", "Iniciar sesión"), you MUST return a fresh Spanish "description" (about 120–900 characters) built ONLY from EVENT_TEXT, INTRO, TITLE, DATE, VENUE, ADDRESS in snippets — never copy menus or chrome. If snippets have no usable editorial prose, return "description": null and set needsReview to true with short Spanish reviewNotes.
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

const looseNumber = z.union([z.number(), z.string()]).nullable().optional();

const looseTierSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  sector: z.string().optional(),
  tier: z.string().optional(),
  price: looseNumber,
  fee: looseNumber,
  totalPrice: looseNumber,
  total: looseNumber,
  amount: looseNumber,
  currency: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  rawText: z.string().nullable().optional(),
});

const loosePatchSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  summary: z.string().optional(),
  description: z.union([z.string(), z.null()]).optional(),
  venueName: z.string().optional(),
  address: z.string().optional(),
  categoryPrimary: z.string().optional(),
  categorySecondary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  locationNotes: z.string().optional(),
  reviewNotes: z.string().optional(),
  needsReview: z.boolean().optional(),
  audience: z.string().optional(),
  dateText: z.string().optional(),
  qualityScore: z.number().optional(),
  tiers: z.array(looseTierSchema).optional(),
});

const loosePricingOnlySchema = z.object({
  tiers: z.array(looseTierSchema).optional(),
});

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function sleepMs(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isInsufficientQuotaError(error: unknown): boolean {
  if (!(error instanceof APIError)) {
    return false;
  }
  const body = error.error as { code?: string; message?: string } | undefined;
  if (body?.code === "insufficient_quota") {
    return true;
  }
  const msg = (error.message ?? body?.message ?? "").toLowerCase();
  return msg.includes("exceeded your current quota");
}

function isOpenAiRetryableError(error: unknown): boolean {
  if (!(error instanceof APIError)) {
    return false;
  }
  if (isInsufficientQuotaError(error)) {
    return false;
  }
  return error.status === 429 || error.status === 503;
}

function openAiRetryDelayMs(
  error: unknown,
  attemptZeroBased: number,
  baseMs: number,
): number {
  if (error instanceof APIError && error.headers) {
    const h = error.headers as Headers | Record<string, string>;
    const ra =
      typeof (h as Headers).get === "function"
        ? (h as Headers).get("retry-after")
        : ((h as Record<string, string>)["retry-after"] ??
          (h as Record<string, string>)["Retry-After"]);
    if (ra) {
      const seconds = Number.parseInt(String(ra), 10);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, 120_000);
      }
    }
  }
  const capped = Math.min(baseMs * 2 ** attemptZeroBased, 60_000);
  return capped + Math.floor(Math.random() * 400);
}

function readOpenAiRetryConfig() {
  const maxRetries = Math.max(
    0,
    Number.parseInt(process.env.OPENAI_MAX_RETRIES ?? "6", 10) || 6,
  );
  const baseMs = Math.max(
    500,
    Number.parseInt(process.env.OPENAI_RETRY_BASE_MS ?? "2000", 10) || 2000,
  );
  return { maxRetries, baseMs };
}

function normalizeMoney(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) {
    return undefined;
  }

  const normalized =
    cleaned.includes(".") && cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/\./g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function deriveTierName(tier: z.infer<typeof looseTierSchema>) {
  const direct =
    tier.name ??
    tier.label ??
    tier.title ??
    tier.sector ??
    tier.tier ??
    undefined;

  if (direct?.trim()) {
    return direct.trim();
  }

  if (tier.rawText?.trim()) {
    const match = tier.rawText.match(/^([^:$\n]+?)(?::|\$|$)/);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return undefined;
}

function normalizeTiers(tiers: z.infer<typeof looseTierSchema>[] | undefined) {
  return (tiers ?? [])
    .map((tier, index) => {
      const name = deriveTierName(tier);
      if (!name) {
        return null;
      }

      return {
        name,
        price:
          normalizeMoney(tier.price) ?? normalizeMoney(tier.amount) ?? null,
        fee: normalizeMoney(tier.fee) ?? null,
        totalPrice:
          normalizeMoney(tier.totalPrice) ?? normalizeMoney(tier.total) ?? null,
        currency: tier.currency?.trim() || "CLP",
        sortOrder: tier.sortOrder ?? index,
        rawText: tier.rawText ?? null,
      };
    })
    .filter((tier): tier is NonNullable<typeof tier> => tier !== null);
}

function normalizeAudience(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "adult") {
    return "adult" as const;
  }
  if (normalized === "family") {
    return "family" as const;
  }
  if (normalized === "kids") {
    return "kids" as const;
  }
  if (normalized === "all_ages" || normalized === "all ages") {
    return "all_ages" as const;
  }
  return undefined;
}

function normalizePatch(
  patch: z.infer<typeof loosePatchSchema>,
): LlmEnrichmentPatch {
  return {
    title: patch.title,
    subtitle: patch.subtitle,
    summary: patch.summary,
    description: patch.description,
    venueName: patch.venueName,
    address: patch.address,
    categoryPrimary: patch.categoryPrimary
      ? mapCategory(patch.categoryPrimary)
      : undefined,
    categorySecondary: patch.categorySecondary,
    tags: patch.tags,
    locationNotes: patch.locationNotes,
    reviewNotes: patch.reviewNotes,
    needsReview: patch.needsReview,
    audience: normalizeAudience(patch.audience),
    dateText: patch.dateText,
    qualityScore: patch.qualityScore,
    tiers: normalizeTiers(patch.tiers),
  };
}

async function requestStructuredObject<T>({
  client,
  model,
  system,
  user,
  schema,
  schemaName,
}: {
  client: OpenAI;
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
}): Promise<T> {
  const { maxRetries, baseMs } = readOpenAiRetryConfig();

  const runOnce = async (): Promise<T> => {
    try {
      const completion = await client.chat.completions.parse({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: zodResponseFormat(schema, schemaName),
        temperature: 0.2,
      });

      const parsed = completion.choices[0]?.message.parsed;
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      if (isOpenAiRetryableError(error)) {
        throw error;
      }
      // Fall through to plain JSON mode.
    }

    const fallback = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `${system}\nRespond with a valid JSON object only.`,
        },
        { role: "user", content: user },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const content = fallback.choices[0]?.message.content;
    const text = Array.isArray(content)
      ? content.map((part) => ("text" in part ? part.text : "")).join("")
      : (content ?? "");
    const jsonText = extractJsonObject(text);

    if (!jsonText) {
      throw new Error(`OpenAI ${schemaName} fallback returned no JSON object`);
    }

    const data = JSON.parse(jsonText) as unknown;
    return schema.parse(data);
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runOnce();
    } catch (error) {
      lastError = error;
      if (!isOpenAiRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      const waitMs = openAiRetryDelayMs(error, attempt, baseMs);
      await sleepMs(waitMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function extractPricingTiers(
  client: OpenAI,
  model: string,
  candidate: EventCandidate,
  pricingText: string,
) {
  const parsed = await requestStructuredObject({
    client,
    model,
    system: pricingPrompt,
    user: JSON.stringify({
      title: candidate.title,
      source: candidate.source,
      pricing: pricingText,
    }),
    schema: loosePricingOnlySchema,
    schemaName: "pricing_tiers",
  });

  return normalizeTiers(parsed.tiers);
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

  const parsed = await requestStructuredObject({
    client,
    model,
    system: systemPrompt,
    user: userContent,
    schema: loosePatchSchema,
    schemaName: "event_enrichment_patch",
  });
  const normalizedPatch = llmEnrichmentPatchSchema.parse(
    normalizePatch(parsed),
  );
  if (
    (!normalizedPatch.tiers || normalizedPatch.tiers.length === 0) &&
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
        ...normalizedPatch,
        tiers,
      };
    }
  }

  return normalizedPatch;
}
