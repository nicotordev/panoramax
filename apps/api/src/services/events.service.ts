import { Prisma } from "../generated/prisma/client.js";
import { TranslationLocale } from "../generated/prisma/enums.js";
import type { EventModel } from "../generated/prisma/models/Event.js";
import { serializeEvent } from "../lib/events/serialize-event.js";
import { buildEventSlug } from "../lib/ingestion/core/shared.js";
import { toPrismaJsonInput } from "../lib/prisma-json.js";
import { prisma } from "../lib/prisma.js";
import type {
  EventCreateInput,
  EventTierInput,
  EventUpdateInput,
  ListEventsQuery,
} from "../lib/validation/events.schema.js";

type EventCreateInputWithoutTiers = Omit<EventCreateInput, "tiers">;

function toCreateData(
  data: EventCreateInputWithoutTiers,
): Prisma.EventUncheckedCreateInput {
  const { categoriesSource, tags, editorialLabels, rawPayload, ...rest } = data;
  const slug =
    data.slug ??
    buildEventSlug({
      title: data.title,
      source: data.source,
      sourceEventId: data.sourceEventId,
      sourceUrl: data.sourceUrl,
    });

  return {
    ...rest,
    slug,
    rawPayload: toPrismaJsonInput(rawPayload),
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    editorialLabels: editorialLabels ?? [],
  };
}

function toTierCreateData(
  tiers: EventTierInput[] | undefined,
  eventId: string,
) {
  return (tiers ?? []).map((tier, index) => ({
    eventId,
    name: tier.name,
    price: tier.price ?? null,
    fee: tier.fee ?? null,
    totalPrice: tier.totalPrice ?? null,
    currency: tier.currency ?? "CLP",
    sortOrder: tier.sortOrder ?? index,
    rawText: tier.rawText ?? null,
  }));
}

type EventWithLocalizedRelations = Prisma.EventGetPayload<{
  include: {
    translations: true;
    tiers: {
      orderBy: { sortOrder: "asc" };
      include: { translations: true };
    };
  };
}>;

function applyLocaleTranslations(
  event: EventWithLocalizedRelations,
  locale?: TranslationLocale,
) {
  const serialized = serializeEvent(event);
  if (!locale) {
    return serialized;
  }

  const translation =
    event.translations.find((t) => t.locale === locale) ?? null;
  const tierTranslationsByTierId = new Map(
    event.tiers.map((tier) => {
      const translation =
        tier.translations.find((t) => t.locale === locale) ?? null;
      return [tier.id, translation] as const;
    }),
  );

  const localizedTiers = serialized.tiers.map((tier) => {
    const tierTranslation = tierTranslationsByTierId.get(tier.id) ?? null;

    if (!tierTranslation) {
      return tier;
    }

    return {
      ...tier,
      name: tierTranslation.name ?? tier.name,
      rawText: tierTranslation.rawText ?? tier.rawText,
      translation: {
        locale: tierTranslation.locale,
        name: tierTranslation.name,
        rawText: tierTranslation.rawText,
        autoTranslated: tierTranslation.autoTranslated,
        sourceLocale: tierTranslation.sourceLocale,
        provider: tierTranslation.provider,
        version: tierTranslation.version,
        updatedAt: tierTranslation.updatedAt,
      },
    };
  });

  if (!translation) {
    return {
      ...serialized,
      tiers: localizedTiers,
    };
  }

  return {
    ...serialized,
    title: translation.title ?? serialized.title,
    subtitle: translation.subtitle ?? serialized.subtitle,
    summary: translation.summary ?? serialized.summary,
    description: translation.description ?? serialized.description,
    dateText: translation.dateText ?? serialized.dateText,
    venueName: translation.venueName ?? serialized.venueName,
    locationNotes: translation.locationNotes ?? serialized.locationNotes,
    priceText: translation.priceText ?? serialized.priceText,
    availabilityText:
      translation.availabilityText ?? serialized.availabilityText,
    tiers: localizedTiers,
    translation: {
      locale: translation.locale,
      title: translation.title,
      subtitle: translation.subtitle,
      summary: translation.summary,
      description: translation.description,
      dateText: translation.dateText,
      venueName: translation.venueName,
      locationNotes: translation.locationNotes,
      priceText: translation.priceText,
      availabilityText: translation.availabilityText,
      autoTranslated: translation.autoTranslated,
      sourceLocale: translation.sourceLocale,
      provider: translation.provider,
      version: translation.version,
      updatedAt: translation.updatedAt,
    },
  };
}

class EventsService {
  public async list(query: ListEventsQuery) {
    const {
      page,
      limit,
      city,
      commune,
      region,
      source,
      status,
      categoryPrimary,
      locale,
      sortBy,
    } = query;
    const skip = (page - 1) * limit;
    const orderBy =
      sortBy === "startAtAsc"
        ? { startAt: "asc" as const }
        : { startAt: "desc" as const };

    const where: Prisma.EventWhereInput = {
      ...(city !== undefined && city !== "" ? { city } : {}),
      ...(commune !== undefined && commune !== "" ? { commune } : {}),
      ...(region !== undefined && region !== "" ? { region } : {}),
      ...(source !== undefined && source !== "" ? { source } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(categoryPrimary !== undefined ? { categoryPrimary } : {}),
    };

    const [rows, total, freeTotal, distinctCommunes] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          translations: locale
            ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
            : true,
          tiers: {
            orderBy: { sortOrder: "asc" },
            include: {
              translations: locale
                ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
                : true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
      prisma.event.count({
        where: {
          ...where,
          isFree: true,
        },
      }),
      prisma.event.findMany({
        where,
        select: { commune: true },
        distinct: ["commune"],
      }),
    ]);

    return {
      items: rows.map((row) => applyLocaleTranslations(row, locale)),
      total,
      page,
      limit,
      stats: {
        communes: distinctCommunes.filter((row) => row.commune.trim() !== "")
          .length,
        free: freeTotal,
      },
    };
  }

  public async listCurrentWeekEvents(query?: ListEventsQuery) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const city = query?.city;
    const commune = query?.commune;
    const region = query?.region;
    const source = query?.source;
    const status = query?.status;
    const categoryPrimary = query?.categoryPrimary;
    const locale = query?.locale;
    const skip = (page - 1) * limit;

    // Upcoming events only: from today (now) until the end of NEXT WEEK (Sunday 23:59:59).
    // This covers the rest of current week plus the full next week.
    const now = new Date();

    // Get Monday of current week
    const startOfCurrentWeek = new Date(now);
    const day = startOfCurrentWeek.getDay(); // 0 (Sun) ... 6 (Sat)
    // Calculate how many days since last Monday (Monday = 1)
    const diffToMonday = (day + 6) % 7;

    // For the start boundary: use NOW (not start of week) to not show past events of current week
    const startOfWindow = new Date(now);

    // For end: get to next week's Sunday 23:59:59.999
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() - diffToMonday + 6); // this week's Sunday
    endOfCurrentWeek.setHours(23, 59, 59, 999);

    const endOfWindow = new Date(endOfCurrentWeek);
    endOfWindow.setDate(endOfWindow.getDate() + 7); // Next week's Sunday
    endOfWindow.setHours(23, 59, 59, 999);

    const where: Prisma.EventWhereInput = {
      ...(city !== undefined && city !== "" ? { city } : {}),
      ...(commune !== undefined && commune !== "" ? { commune } : {}),
      ...(region !== undefined && region !== "" ? { region } : {}),
      ...(source !== undefined && source !== "" ? { source } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(categoryPrimary !== undefined ? { categoryPrimary } : {}),
      startAt: {
        gte: startOfWindow,
        lt: endOfWindow,
      },
    };

    const [rows, total, freeTotal, distinctCommunes] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startAt: "asc" },
        skip,
        take: limit,
        include: {
          translations: locale
            ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
            : true,
          tiers: {
            orderBy: { sortOrder: "asc" },
            include: {
              translations: locale
                ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
                : true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
      prisma.event.count({
        where: {
          ...where,
          isFree: true,
        },
      }),
      prisma.event.findMany({
        where,
        select: { commune: true },
        distinct: ["commune"],
      }),
    ]);

    return {
      items: rows.map((row) => applyLocaleTranslations(row, locale)),
      total,
      page,
      limit,
      stats: {
        communes: distinctCommunes.filter((row) => row.commune.trim() !== "")
          .length,
        free: freeTotal,
      },
      weekRange: {
        start: startOfWindow.toISOString(),
        end: endOfWindow.toISOString(),
      },
    };
  }

  public async getById(
    id: string,
    locale?: TranslationLocale,
  ): Promise<ReturnType<typeof serializeEvent> | null> {
    const row = await prisma.event.findUnique({
      where: { id },
      include: {
        translations: locale
          ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
          : true,
        tiers: {
          orderBy: { sortOrder: "asc" },
          include: {
            translations: locale
              ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
              : true,
          },
        },
      },
    });
    return row ? applyLocaleTranslations(row, locale) : null;
  }

  public async getBySlug(
    slug: string,
    locale?: TranslationLocale,
  ): Promise<ReturnType<typeof serializeEvent> | null> {
    const row = await prisma.event.findUnique({
      where: { slug },
      include: {
        translations: locale
          ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
          : true,
        tiers: {
          orderBy: { sortOrder: "asc" },
          include: {
            translations: locale
              ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
              : true,
          },
        },
      },
    });
    return row ? applyLocaleTranslations(row, locale) : null;
  }

  public async create(data: EventCreateInput, locale?: TranslationLocale) {
    const { tiers, ...eventData } = data;
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: toCreateData(eventData),
      });
      const tierData = toTierCreateData(tiers, created.id);
      if (tierData.length > 0) {
        await tx.eventTier.createMany({ data: tierData });
      }
      return tx.event.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          translations: locale
            ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
            : true,
          tiers: {
            orderBy: { sortOrder: "asc" },
            include: {
              translations: locale
                ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
                : true,
            },
          },
        },
      });
    });
    return applyLocaleTranslations(row, locale);
  }

  public async update(
    id: string,
    data: EventUpdateInput,
    locale?: TranslationLocale,
  ) {
    const { rawPayload, tiers, ...rest } = data;
    const slug =
      data.slug ??
      (data.title && data.source && data.sourceUrl
        ? buildEventSlug({
            title: data.title,
            source: data.source,
            sourceEventId: data.sourceEventId,
            sourceUrl: data.sourceUrl,
          })
        : undefined);
    const patch: Prisma.EventUncheckedUpdateInput = {
      ...rest,
      ...(slug !== undefined ? { slug } : {}),
      ...(rawPayload !== undefined
        ? { rawPayload: toPrismaJsonInput(rawPayload) }
        : {}),
    };
    const row = await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: patch,
      });
      if (tiers !== undefined) {
        await tx.eventTier.deleteMany({ where: { eventId: id } });
        const tierData = toTierCreateData(tiers, id);
        if (tierData.length > 0) {
          await tx.eventTier.createMany({ data: tierData });
        }
      }
      return tx.event.findUniqueOrThrow({
        where: { id },
        include: {
          translations: locale
            ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
            : true,
          tiers: {
            orderBy: { sortOrder: "asc" },
            include: {
              translations: locale
                ? { where: { locale }, take: 1, orderBy: { updatedAt: "desc" } }
                : true,
            },
          },
        },
      });
    });
    return applyLocaleTranslations(row, locale);
  }

  public async delete(id: string): Promise<EventModel> {
    return prisma.event.delete({ where: { id } });
  }
}

const eventsService = new EventsService();

export default eventsService;
