/**
 * Optional LLM step to clean messy venue/address strings before geocoding.
 * Use only as a fallback after Nominatim fails — keeps cost and hallucination risk low.
 */

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { GeocodeEventInput } from "./nominatim.js";

const locationNormalizeSchema = z.object({
  venueName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

const systemPrompt = `You normalize Chilean cultural event locations for OpenStreetMap geocoding.
The input JSON may mix venue name, address, comuna, city, dates, schedules, and placeholder text like "Sin comuna informada" or "Sin ciudad informada".

Return ONLY fields you can clean up from the given text. Omit a key if you have nothing better than the input.

Rules:
- country: prefer ISO 3166-1 alpha-2 "CL" for Chile when the event is in Chile.
- commune: official comuna name when possible (e.g. Ñuñoa, Colina, Puente Alto, San José de Maipo, La Reina, Concepción). Remove placeholder phrases.
- city: for Región Metropolitana, "Santiago" is often the ciudad; comuna is more specific — keep both when useful.
- address: street and number only when present in the input; do not invent numbers or street names.
- venueName: short human venue name; strip duplicated venue phrases, weekdays, dates (e.g. "Viernes 27 Marzo"), and ticket blurbs.
- If the location is only a rural area or landmark without a parseable street, set address to null and keep the best placename in venueName plus comuna/city if inferable.
- Never fabricate coordinates or postal codes.`;

/**
 * Returns a copy of the event with LLM-cleaned location fields, or null if the API is unavailable or the call fails.
 */
export async function normalizeLocationWithLlm(
  event: GeocodeEventInput,
): Promise<GeocodeEventInput | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_GEOCODE_MODEL?.trim() ??
    process.env.OPENAI_INGEST_MODEL?.trim() ??
    "gpt-4o-mini";

  try {
    const completion = await client.chat.completions.parse({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            venueName: event.venueName,
            address: event.address,
            commune: event.commune,
            city: event.city,
            country: event.country,
            isOnline: event.isOnline,
          }),
        },
      ],
      response_format: zodResponseFormat(
        locationNormalizeSchema,
        "location_normalize",
      ),
      temperature: 0.1,
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      return null;
    }

    const pick = (llm: string | null | undefined, orig: string) => {
      const t = llm?.trim();
      return t && t.length > 0 ? t : orig;
    };

    const addressMerged =
      parsed.address === undefined
        ? event.address
        : parsed.address === null || parsed.address.trim() === ""
          ? null
          : parsed.address.trim();

    return {
      ...event,
      venueName: pick(parsed.venueName, event.venueName),
      address: addressMerged,
      commune: pick(parsed.commune, event.commune),
      city: pick(parsed.city, event.city),
      country: pick(parsed.country, event.country),
    };
  } catch (error) {
    console.warn(
      "[geocode] LLM normalize failed:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
