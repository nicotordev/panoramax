import { slugFromUrl } from "../core/shared-pure.js";

/**
 * Campos opcionales extraídos solo del índice / listado (cards, grilla).
 * La fase detalle puede completar o sobreescribir.
 */
export type ListingPrefetch = {
  title?: string;
  rawTitle?: string;
  imageUrl?: string | null;
  dateText?: string | null;
  venueName?: string | null;
  categoryText?: string | null;
  /** Texto corto de la tarjeta (debug / LLM). */
  listingSnippet?: string;
};

export type ListingRow = {
  sourceUrl: string;
  sourceEventId?: string | null;
  prefetch: ListingPrefetch;
};

export function dedupeListingRowsByUrl(rows: ListingRow[]): ListingRow[] {
  const seen = new Map<string, ListingRow>();
  for (const row of rows) {
    if (!seen.has(row.sourceUrl)) {
      seen.set(row.sourceUrl, row);
    }
  }
  return [...seen.values()];
}

function nonEmpty(s: string | null | undefined): s is string {
  return Boolean(s?.trim());
}

/** Prioriza valores del detalle; si faltan, usa prefetch del listado. */
export function mergeListingDetailStrings(params: {
  detailTitle: string;
  listingTitle?: string | null;
  sourceUrl: string;
}): string {
  const d = params.detailTitle.trim();
  if (d) {
    return d;
  }
  const p = params.listingTitle?.trim();
  if (p) {
    return p;
  }
  return slugFromUrl(params.sourceUrl);
}

export function mergeOptionalImage(
  detail: string | null | undefined,
  listing: string | null | undefined,
): string | null {
  if (nonEmpty(detail)) {
    return detail ?? null;
  }
  if (nonEmpty(listing)) {
    return listing ?? null;
  }
  return null;
}

export function mergeOptionalDateText(
  detail: string | null | undefined,
  listing: string | null | undefined,
): string | null {
  if (nonEmpty(detail)) {
    return detail ?? null;
  }
  if (nonEmpty(listing)) {
    return listing ?? null;
  }
  return null;
}
