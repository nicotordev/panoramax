/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key).
 *
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * — Identify your app with a valid User-Agent (set NOMINATIM_USER_AGENT).
 * — At most ~1 request/second on the public instance; throttle bulk jobs.
 *
 * Alternatives for production scale: self-hosted Nominatim, Mapbox, Google Geocoding.
 */

export type NominatimGeocodeResult = {
  lat: number;
  lon: number;
};

type NominatimSearchHit = {
  lat: string;
  lon: string;
};

export type GeocodeEventInput = {
  isOnline: boolean;
  venueName: string;
  address?: string | null;
  commune: string;
  city: string;
  country: string;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Public Nominatim: ~1 request per second (configurable for self-hosted). */
const MIN_REQUEST_INTERVAL_MS = () => {
  const raw = process.env.NOMINATIM_MIN_INTERVAL_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 1100;
  return Number.isFinite(n) && n >= 100 ? n : 1100;
};

let nominatimRequestQueue: Promise<void> = Promise.resolve();
let lastNominatimRequestEnd = 0;

/** Serialized + spaced HTTP to respect https://operations.osmfoundation.org/policies/nominatim/ */
export async function rateLimitedNominatimFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const run = nominatimRequestQueue.then(async () => {
    const gap = MIN_REQUEST_INTERVAL_MS();
    const elapsed = Date.now() - lastNominatimRequestEnd;
    const wait = Math.max(0, gap - elapsed);
    await sleep(wait);
    const response = await fetch(input, init);
    lastNominatimRequestEnd = Date.now();
    return response;
  });
  nominatimRequestQueue = run.then(() => {}).catch(() => {});
  return run;
}

/**
 * Removes duplicate comma/semicolon-separated segments (case-insensitive).
 * Fixes strings like "Sala …, Marín 321, Santiago, Chile, Santiago, Santiago, Chile".
 */
export function dedupeLocationSegments(input: string): string {
  const segments = input
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const seg of segments) {
    const key = seg.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(seg);
  }
  return out.join(", ");
}

function countryLabel(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === "CL") return "Chile";
  return code.trim();
}

function defaultUserAgent(): string {
  const fromEnv = process.env.NOMINATIM_USER_AGENT?.trim();
  if (fromEnv) return fromEnv;
  return "Panoramax/1.0 (event geocoding; set NOMINATIM_USER_AGENT in production)";
}

function defaultFetchHeaders(): Record<string, string> {
  return {
    "User-Agent": defaultUserAgent(),
    Accept: "application/json",
    "Accept-Language": "es-CL,es;q=0.9",
  };
}

const GARBAGE_LOCALITY = /^(sin comuna informada|sin comuna|n\/a|s\.?\s*i\.?)$/i;
const DATE_LIKE_SEGMENT =
  /^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i;

/** Drops editor placeholders and date junk that breaks geocoding. */
export function sanitizeLocationSegment(segment: string): string {
  const t = segment.trim();
  if (!t) return "";
  if (GARBAGE_LOCALITY.test(t)) return "";
  if (DATE_LIKE_SEGMENT.test(t)) return "";
  if (/^\d{1,2}\s+(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(
    t,
  )) {
    return "";
  }
  return t;
}

/**
 * Fills missing commune from city when data quality is poor, trims venue noise.
 */
export function normalizeEventForGeocode(event: GeocodeEventInput): GeocodeEventInput {
  const venueRaw = (event.venueName ?? "").trim();
  const venueParts = venueRaw
    .split(/[;,]/)
    .map(sanitizeLocationSegment)
    .filter(Boolean);
  const venueName =
    venueParts.length > 0 ? dedupeLocationSegments(venueParts.join(", ")) : venueRaw;

  let commune = sanitizeLocationSegment(event.commune ?? "");
  const cityRaw = (event.city ?? "").trim();
  const city = sanitizeLocationSegment(cityRaw) || cityRaw;
  if (!commune && city) {
    commune = city;
  }

  const address = (event.address ?? "").trim();

  return {
    ...event,
    venueName: venueName || venueRaw,
    address: address || null,
    commune: commune || "",
    city: city || "",
  };
}

/**
 * Stable cache key: normalized query line (after dedupe + sanitation).
 */
export function geocodeCacheKey(event: GeocodeEventInput): string | null {
  const n = normalizeEventForGeocode(event);
  return buildGeocodeQueryFromEvent(n);
}

/**
 * Builds a single-line query from venue fields (Chile-oriented defaults).
 */
export function buildGeocodeQueryFromEvent(event: GeocodeEventInput): string | null {
  if (event.isOnline) return null;

  const rawParts = [
    event.venueName?.trim(),
    event.address?.trim(),
    event.commune?.trim(),
    event.city?.trim(),
    countryLabel(event.country),
  ];

  const parts = rawParts
    .map((p) => (p ? sanitizeLocationSegment(p) : ""))
    .filter((p): p is string => Boolean(p && p.length > 0));

  if (parts.length === 0) return null;
  return dedupeLocationSegments(parts.join(", "));
}

/**
 * Ordered free-text queries to try (deduped, progressively simpler).
 */
export function buildGeocodeQueryVariants(event: GeocodeEventInput): string[] {
  if (event.isOnline) return [];

  const country = countryLabel(event.country);
  const commune = event.commune?.trim() ?? "";
  const city = event.city?.trim() ?? "";
  const venue = event.venueName?.trim() ?? "";
  const address = event.address?.trim() ?? "";

  const variants: string[] = [];

  const push = (q: string) => {
    const d = dedupeLocationSegments(q);
    if (d && !variants.includes(d)) variants.push(d);
  };

  push([venue, address, commune, city, country].filter(Boolean).join(", "));

  if (address) {
    push([address, commune, city, country].filter(Boolean).join(", "));
  }

  const venueHead = venue.split(",")[0]?.trim();
  if (venueHead && venueHead.length >= 3 && venueHead.length < 120) {
    push([venueHead, commune, country].filter(Boolean).join(", "));
  }

  push([commune, city, country].filter(Boolean).join(", "));

  return variants;
}

/** If the line contains a house number, Nominatim structured search often works better than a long `q`. */
export function parseStreetAndRest(address: string): { street: string } | null {
  const line = address.trim();
  if (!line || line.length > 200) return null;
  if (!/\d/.test(line)) return null;
  return { street: line };
}

/** First comma/semicolon segment that looks like a street + number (e.g. from venue text). */
export function extractStreetCandidateFromVenueText(text: string): string | null {
  const segments = text.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    if (seg.length >= 5 && seg.length <= 160 && /\d/.test(seg)) {
      return seg;
    }
  }
  return null;
}

/**
 * Resolves a free-text address to WGS84 coordinates using Nominatim search.
 *
 * @param countryCode ISO 3166-1 alpha-2 (e.g. "cl") — omit to search without country filter
 */
export async function geocodeAddressNominatim(
  query: string,
  options?: { countryCode?: string },
): Promise<NominatimGeocodeResult | null> {
  const q = dedupeLocationSegments(query);
  if (!q) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);
  if (options?.countryCode) {
    url.searchParams.set("countrycodes", options.countryCode.toLowerCase());
  }

  const response = await rateLimitedNominatimFetch(url, { headers: defaultFetchHeaders() });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimSearchHit[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number.parseFloat(data[0].lat);
  const lon = Number.parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

/**
 * Structured search (street + city + country) — often works when `q` fails on long strings.
 */
export async function geocodeStructuredNominatim(opts: {
  street: string;
  city: string;
  country?: string;
  countryCode?: string;
}): Promise<NominatimGeocodeResult | null> {
  const street = opts.street.trim();
  const city = opts.city.trim();
  if (!street || !city) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("street", street);
  url.searchParams.set("city", city);
  if (opts.country) {
    url.searchParams.set("country", opts.country);
  }
  if (opts.countryCode) {
    url.searchParams.set("countrycodes", opts.countryCode.toLowerCase());
  }

  const response = await rateLimitedNominatimFetch(url, { headers: defaultFetchHeaders() });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimSearchHit[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = Number.parseFloat(data[0].lat);
  const lon = Number.parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

export type GeocodeAttemptLog = {
  label: string;
};

/**
 * Tries structured search first (street + city), then deduped free-text variants,
 * each with `countrycodes` then without (OSM coverage varies).
 * HTTP spacing is enforced by `rateLimitedNominatimFetch` (~1 req/s on the public instance).
 */
export async function geocodeEventBestEffort(
  event: GeocodeEventInput,
  options?: {
    onAttempt?: (log: GeocodeAttemptLog) => void;
  },
): Promise<NominatimGeocodeResult | null> {
  if (event.isOnline) return null;

  const onAttempt = options?.onAttempt;
  const normalized = normalizeEventForGeocode(event);
  const country = countryLabel(normalized.country);
  const countryCode = normalized.country?.trim().toLowerCase() || "cl";
  /** Prefer commune — in Chile RM, `city` is often "Santiago" for every comuna; OSM matches comuna names better. */
  const locality = normalized.commune?.trim() || normalized.city?.trim() || "";

  const tryStructured = async (street: string, cityName: string, label: string) => {
    onAttempt?.({ label: `${label} [structured + ${countryCode}]` });
    let r = await geocodeStructuredNominatim({
      street,
      city: cityName,
      country,
      countryCode,
    });
    if (r) return r;

    onAttempt?.({ label: `${label} [structured, no countrycodes]` });
    r = await geocodeStructuredNominatim({
      street,
      city: cityName,
      country,
    });
    return r;
  };

  const tryFreeform = async (q: string, label: string) => {
    onAttempt?.({ label: `${label} [q + ${countryCode}]` });
    let r = await geocodeAddressNominatim(q, { countryCode });
    if (r) return r;

    onAttempt?.({ label: `${label} [q, global]` });
    r = await geocodeAddressNominatim(q, {});
    return r;
  };

  // 1) Structured: explicit address field
  const addr = normalized.address?.trim();
  if (addr && locality) {
    const parsed = parseStreetAndRest(addr);
    if (parsed) {
      const hit = await tryStructured(parsed.street, locality, "address");
      if (hit) return hit;
    }
  }

  // 2) Structured: street-like segment from venue / combined text
  if (locality) {
    const fromVenue = extractStreetCandidateFromVenueText(
      [normalized.venueName, normalized.address].filter(Boolean).join(", "),
    );
    if (fromVenue) {
      const hit = await tryStructured(fromVenue, locality, "venue/address segment");
      if (hit) return hit;
    }
  }

  // 3) Free-text variants (deduped)
  const variants = buildGeocodeQueryVariants(normalized);
  let i = 0;
  for (const q of variants) {
    i++;
    const hit = await tryFreeform(q, `variant ${i}`);
    if (hit) return hit;
  }

  return null;
}
