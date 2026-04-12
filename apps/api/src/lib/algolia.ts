import { algoliasearch } from "algoliasearch";

const EVENTS_INDEX_NAME = process.env.EVENTS_INDEX_NAME ?? "events_index";

function truncateText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return value;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
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
          attributesForFaceting: ["city", "categoryPrimary", "audience"],
        },
      });
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
          ? source.translations.map((translation) => {
              const item = translation as Record<string, unknown>;
              return {
                locale: item.locale,
                title: truncateText(item.title, 160),
                subtitle: truncateText(item.subtitle, 220),
                summary: truncateText(item.summary, 400),
                dateText: truncateText(item.dateText, 180),
                venueName: truncateText(item.venueName, 180),
                locationNotes: truncateText(item.locationNotes, 240),
                priceText: truncateText(item.priceText, 180),
                availabilityText: truncateText(item.availabilityText, 180),
              };
            })
          : [];

        const tiers = Array.isArray(source.tiers)
          ? source.tiers.map((tier) => {
              const item = tier as Record<string, unknown>;
              const tierTranslations = Array.isArray(item.translations)
                ? item.translations.map((translation) => {
                    const translationItem = translation as Record<
                      string,
                      unknown
                    >;
                    return {
                      locale: translationItem.locale,
                      name: truncateText(translationItem.name, 160),
                    };
                  })
                : [];

              return {
                id: item.id,
                name: truncateText(item.name, 160),
                price: item.price,
                fee: item.fee,
                totalPrice: item.totalPrice,
                currency: item.currency,
                sortOrder: item.sortOrder,
                translations: tierTranslations,
              };
            })
          : [];

        return {
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
          categorySecondary: source.categorySecondary,
          categoriesSource: source.categoriesSource,
          tags: source.tags,
          audience: source.audience,
          editorialLabels: source.editorialLabels,
          qualityScore: source.qualityScore,
          needsReview: source.needsReview,
          translations,
          tiers,
          objectID: String(event.id),
        };
      }),
    });
  }
}

const algolia = new Algolia();

export default algolia;
