import { algoliasearch } from "algoliasearch";

const EVENTS_INDEX_NAME = process.env.EVENTS_INDEX_NAME ?? "events_index";
const EVENTS_INDEX_START_AT_ASC_REPLICA =
  process.env.EVENTS_INDEX_START_AT_ASC_REPLICA ??
  `${EVENTS_INDEX_NAME}_startAt_asc`;
const EVENTS_INDEX_START_AT_DESC_REPLICA =
  process.env.EVENTS_INDEX_START_AT_DESC_REPLICA ??
  `${EVENTS_INDEX_NAME}_startAt_desc`;
const EVENTS_INDEX_QUALITY_DESC_REPLICA =
  process.env.EVENTS_INDEX_QUALITY_DESC_REPLICA ??
  `${EVENTS_INDEX_NAME}_quality_desc`;
const ALGOLIA_MAX_RECORD_BYTES = 10_000;
const ALGOLIA_TARGET_RECORD_BYTES = 9_500;

function truncateText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return value;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function toTrimmedStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => truncateText(item.trim(), maxLength))
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    )
    .slice(0, maxItems);
}

function fitRecordSize<T extends Record<string, unknown>>(record: T): T {
  if (byteSize(record) <= ALGOLIA_TARGET_RECORD_BYTES) {
    return record;
  }

  const compacted = { ...record } as Record<string, unknown>;
  const optionalFieldDropOrder = [
    "tiers",
    "translations",
    "tags",
    "editorialLabels",
    "categoriesSource",
    "imageAttribution",
    "locationNotes",
    "availabilityText",
    "priceText",
    "address",
    "subtitle",
    "summary",
    "sourceUrl",
    "ticketUrl",
  ];

  for (const field of optionalFieldDropOrder) {
    if (field in compacted) {
      delete compacted[field];
      if (byteSize(compacted) <= ALGOLIA_TARGET_RECORD_BYTES) {
        return compacted as T;
      }
    }
  }

  compacted.title = truncateText(compacted.title, 120);
  compacted.venueName = truncateText(compacted.venueName, 120);
  compacted.dateText = truncateText(compacted.dateText, 120);

  if (byteSize(compacted) <= ALGOLIA_TARGET_RECORD_BYTES) {
    return compacted as T;
  }

  const minimalRecord = {
    objectID: String(compacted.objectID ?? compacted.id ?? ""),
    id: compacted.id,
    slug: compacted.slug,
    title: truncateText(compacted.title, 100),
    imageUrl: compacted.imageUrl,
    startAt: compacted.startAt,
    endAt: compacted.endAt,
    status: compacted.status,
    venueName: truncateText(compacted.venueName, 100),
    city: compacted.city,
    commune: compacted.commune,
    region: compacted.region,
    isFree: compacted.isFree,
    categoryPrimary: compacted.categoryPrimary,
    audience: compacted.audience,
    qualityScore: compacted.qualityScore,
  } as unknown as T;

  if (byteSize(minimalRecord) > ALGOLIA_MAX_RECORD_BYTES) {
    console.warn(
      `[Algolia] Record ${minimalRecord.objectID} is still too large after compaction (${byteSize(minimalRecord)} bytes).`,
    );
  }

  return minimalRecord;
}

class Algolia {
  private client: ReturnType<typeof algoliasearch>;

  constructor() {
    this.client = algoliasearch(
      process.env.ALGOLIA_APP_ID!,
      process.env.ALGOLIA_API_KEY!,
    );
  }

  /**
   * Declares facet attributes for the events index. Without this, Algolia
   * returns no refinement values for `useRefinementList` in the storefront.
   * Requires an API key with `settings` ACL (typically the Admin API key).
   */
  /** @returns whether Algolia accepted the settings update */
  public async ensureEventsIndexSettings(): Promise<boolean> {
    try {
      await this.client.setSettings({
        indexName: EVENTS_INDEX_NAME,
        indexSettings: {
          attributesForFaceting: [
            "commune",
            "city",
            "region",
            "categoryPrimary",
            "audience",
          ],
          replicas: [
            EVENTS_INDEX_START_AT_ASC_REPLICA,
            EVENTS_INDEX_START_AT_DESC_REPLICA,
            EVENTS_INDEX_QUALITY_DESC_REPLICA,
          ],
          customRanking: ["desc(qualityScore)", "asc(startAt)"],
        },
      });

      await Promise.all([
        this.client.setSettings({
          indexName: EVENTS_INDEX_START_AT_ASC_REPLICA,
          indexSettings: {
            customRanking: ["asc(startAt)", "desc(qualityScore)"],
          },
        }),
        this.client.setSettings({
          indexName: EVENTS_INDEX_START_AT_DESC_REPLICA,
          indexSettings: {
            customRanking: ["desc(startAt)", "desc(qualityScore)"],
          },
        }),
        this.client.setSettings({
          indexName: EVENTS_INDEX_QUALITY_DESC_REPLICA,
          indexSettings: {
            customRanking: ["desc(qualityScore)", "asc(startAt)"],
          },
        }),
      ]);

      return true;
    } catch (error) {
      console.warn(
        "Algolia setSettings failed (facets may stay empty until an Admin API key with settings ACL is configured):",
        error,
      );
      return false;
    }
  }

  public async saveEvents<TEvent extends { id: string }>(events: TEvent[]) {
    if (events.length === 0) {
      return;
    }

    return await this.client.saveObjects({
      indexName: EVENTS_INDEX_NAME,
      objects: events.map((event) => {
        const source = event as Record<string, unknown>;
        const translations = Array.isArray(source.translations)
          ? source.translations.slice(0, 5).map((translation) => {
              const item = translation as Record<string, unknown>;
              return {
                locale: item.locale,
                title: truncateText(item.title, 160),
                subtitle: truncateText(item.subtitle, 180),
                summary: truncateText(item.summary, 280),
                dateText: truncateText(item.dateText, 180),
                venueName: truncateText(item.venueName, 180),
                locationNotes: truncateText(item.locationNotes, 160),
                priceText: truncateText(item.priceText, 120),
                availabilityText: truncateText(item.availabilityText, 120),
              };
            })
          : [];

        const record = {
          id: source.id,
          source: source.source,
          sourceType: source.sourceType,
          sourceEventId: source.sourceEventId,
          sourceUrl: source.sourceUrl,
          slug: source.slug,
          ticketUrl: source.ticketUrl,
          importedAt: source.importedAt,
          lastSeenAt: source.lastSeenAt,
          title: truncateText(source.title, 160),
          subtitle: truncateText(source.subtitle, 220),
          summary: truncateText(source.summary, 500),
          language: source.language,
          imageUrl: source.imageUrl,
          imageAttribution: source.imageAttribution,
          startAt: source.startAt,
          endAt: source.endAt,
          timezone: source.timezone,
          allDay: source.allDay,
          dateText: truncateText(source.dateText, 180),
          status: source.status,
          venueName: truncateText(source.venueName, 180),
          address: truncateText(source.address, 220),
          commune: source.commune,
          city: source.city,
          region: source.region,
          country: source.country,
          latitude: source.latitude,
          longitude: source.longitude,
          isOnline: source.isOnline,
          locationNotes: truncateText(source.locationNotes, 240),
          isFree: source.isFree,
          priceMin: source.priceMin,
          priceMax: source.priceMax,
          currency: source.currency,
          priceText: truncateText(source.priceText, 180),
          availabilityText: truncateText(source.availabilityText, 180),
          categoryPrimary: source.categoryPrimary,
          categorySecondary: truncateText(source.categorySecondary, 120),
          categoriesSource: toTrimmedStringArray(
            source.categoriesSource,
            8,
            80,
          ),
          tags: toTrimmedStringArray(source.tags, 20, 80),
          audience: source.audience,
          editorialLabels: toTrimmedStringArray(source.editorialLabels, 12, 80),
          qualityScore: source.qualityScore,
          needsReview: source.needsReview,
          translations,
          objectID: String(event.id),
        };

        return fitRecordSize(record);
      }),
    });
  }
}

const algolia = new Algolia();

export default algolia;
export {
  EVENTS_INDEX_NAME,
  EVENTS_INDEX_QUALITY_DESC_REPLICA,
  EVENTS_INDEX_START_AT_ASC_REPLICA,
  EVENTS_INDEX_START_AT_DESC_REPLICA,
};
