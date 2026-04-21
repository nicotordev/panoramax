/**
 * Centralized Spanish/Chile date tokens and regexes used across ingestors.
 */

/** Month token → JS month index (UTC), lowercase / accent-stripped keys. */
export const SPANISH_MONTH_TOKEN_TO_INDEX: Record<string, number> = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
};

/**
 * Loose match for a Spanish date fragment inside noisy page text (listing cards, etc.).
 * Does not use named groups — use for discovery; parse with `parseSpanishDateRange`.
 */
export const GENERIC_SPANISH_DATE_REGEX =
  /\d{1,2}\s*(?:de)?\s*(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)(?:\s*(?:de)?\s*20\d{2})?(?:[^\d]{1,10}\d{1,2}[:.]\d{2})?/giu;

/**
 * Full Spanish date/range pattern with named groups for `parseSpanishDateRange`.
 */
export const SPANISH_DATE_DETAILS_REGEX =
  /(?<day>\d{1,2})\s*(?:de)?\s*(?<month>ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|sept|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)(?:\s*(?:de)?\s*(?<year>20\d{2}))?(?:[^\d]{1,10}(?<hours>\d{1,2})[:.](?<minutes>\d{2}))?/giu;

/** Typical CLP price capture in scraped blurbs. */
export const CLP_PRICE_SNIPPET_REGEX =
  /\$\s*[\d.]+(?:[^$]{0,160}\$\s*[\d.]+){0,12}/giu;

export function findFirstMatch(haystack: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    const match = re.exec(haystack);
    if (match?.[0]) {
      return match[0];
    }
  }
  return null;
}
