import {
  communes,
  provinces,
  regions,
  type CLCommuneItem,
} from "@clregions/data";

/**
 * Display / scraper labels → nombre oficial de comuna en datos INE (@clregions/data).
 * Ajusta cuando un venue use un coloquialismo no listado en la división administrativa.
 */
const COMMUNE_DISPLAY_TO_OFFICIAL: Readonly<Record<string, string>> = {
  "santiago centro": "Santiago",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normKey(value: string): string {
  return stripAccents(value.toLowerCase().trim());
}

const provinceIdToRegionId = new Map<string, string>(
  provinces.map((p) => [p.id, p.regionId] as [string, string]),
);
const regionIdToName = new Map<string, string>(
  regions.map((r) => [r.id, r.name] as [string, string]),
);

function pairForCommune(c: CLCommuneItem): { commune: string; region: string } | null {
  const rid = provinceIdToRegionId.get(c.provinceId);
  const region = rid ? regionIdToName.get(rid) : undefined;
  if (!region) {
    return null;
  }
  return { commune: c.name, region };
}

let longestFirstCache: readonly { commune: string; region: string }[] | null = null;

/** Todas las comunas con región, ordenadas por nombre de comuna (más largo primero) para matching en texto. */
export function getCommuneRegionRowsLongestFirst(): readonly {
  commune: string;
  region: string;
}[] {
  if (!longestFirstCache) {
    const rows: { commune: string; region: string }[] = [];
    for (const c of communes) {
      const pair = pairForCommune(c);
      if (pair) {
        rows.push(pair);
      }
    }
    const seen = new Map<string, { commune: string; region: string }>();
    for (const row of rows) {
      if (!seen.has(row.commune)) {
        seen.set(row.commune, row);
      }
    }
    longestFirstCache = Object.freeze(
      [...seen.values()].sort((a, b) => b.commune.length - a.commune.length),
    );
  }
  return longestFirstCache;
}

const officialNameLookup = new Map<string, { commune: string; region: string }>();

function ensureOfficialNameLookup() {
  if (officialNameLookup.size > 0) {
    return;
  }
  for (const c of communes) {
    const pair = pairForCommune(c);
    if (!pair) {
      continue;
    }
    officialNameLookup.set(normKey(pair.commune), pair);
  }
}

/** Resuelve nombre exacto (tras alias) a comuna + región oficiales. */
export function resolveOfficialCommuneByName(
  input: string | null | undefined,
): { commune: string; region: string } | null {
  if (!input?.trim()) {
    return null;
  }
  ensureOfficialNameLookup();
  const trimmed = input.trim();
  const viaAlias = COMMUNE_DISPLAY_TO_OFFICIAL[normKey(trimmed)];
  const attempt = viaAlias ?? trimmed;
  return officialNameLookup.get(normKey(attempt)) ?? null;
}

const MIN_COMMUNE_SUBSTRING_LEN = 4;

/**
 * Primera comuna cuyo nombre oficial aparece como substring en el texto (normalizado).
 * Orden longest-first para reducir falsos positivos.
 */
export function matchCommuneInText(raw: string): { commune: string; region: string } | null {
  const haystack = normKey(raw);
  for (const row of getCommuneRegionRowsLongestFirst()) {
    const needle = normKey(row.commune);
    if (needle.length < MIN_COMMUNE_SUBSTRING_LEN) {
      continue;
    }
    if (haystack.includes(needle)) {
      return row;
    }
  }
  return null;
}

export const METRO_REGION = "Región Metropolitana de Santiago";

/** Region hints when the text names a macro-region but not a comuna. */
export const REGION_TEXT_HINTS: readonly { pattern: RegExp; region: string }[] = [
  { pattern: /metropolitana|rm\b|gran santiago|santiago centro\b/i, region: METRO_REGION },
  { pattern: /valpara[ií]so|vi[nñ]a\b|v region|\bv\s*regi[oó]n\b/i, region: "Región de Valparaíso" },
  { pattern: /antofagasta|ii\s*regi[oó]n/i, region: "Región de Antofagasta" },
  { pattern: /coquimbo|la serena|iv\s*regi[oó]n/i, region: "Región de Coquimbo" },
  { pattern: /biob[ií]o|concepci[oó]n|viii\s*regi[oó]n/i, region: "Región del Biobío" },
  { pattern: /la araucan[ií]a|temuco|ix\s*regi[oó]n/i, region: "Región de La Araucanía" },
  { pattern: /los lagos|puerto montt|osorno|x\s*regi[oó]n/i, region: "Región de Los Lagos" },
  {
    pattern: /magallanes|punta arenas|xii\s*regi[oó]n/i,
    region: "Región de Magallanes y de la Antártica Chilena",
  },
  {
    pattern: /ays[eé]n|coyhaique|xi\s*regi[oó]n/i,
    region: "Región de Aysén del General Carlos Ibáñez del Campo",
  },
  { pattern: /atacama|copiap[oó]|\biii\s*regi[oó]n\b/i, region: "Región de Atacama" },
  { pattern: /maule|talca|vii\s*regi[oó]n/i, region: "Región del Maule" },
  {
    pattern: /o'?higgins|rancagua|vi\s*regi[oó]n/i,
    region: "Región del Libertador General Bernardo O'Higgins",
  },
  { pattern: /\bñuble\b|chill[aá]n|xvi\s*regi[oó]n/i, region: "Región de Ñuble" },
  { pattern: /los r[ií]os|valdivia|xiv\s*regi[oó]n/i, region: "Región de Los Ríos" },
  { pattern: /tarapac[aá]|iquique|i\s*regi[oó]n/i, region: "Región de Tarapacá" },
  { pattern: /arica|xv\s*regi[oó]n|parinacota/i, region: "Región de Arica y Parinacota" },
];

export function inferRegionFromTextHints(haystack: string): string | null {
  const h = haystack.trim();
  if (!h) {
    return null;
  }
  for (const { pattern, region } of REGION_TEXT_HINTS) {
    if (pattern.test(h)) {
      return region;
    }
  }
  return null;
}
