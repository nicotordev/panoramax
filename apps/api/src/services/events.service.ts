import { Prisma } from "../generated/prisma/client.js";
import type { EventModel } from "../generated/prisma/models/Event.js";
import { serializeEvent } from "../lib/events/serialize-event.js";
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

  return {
    ...rest,
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
    } = query;
    const skip = (page - 1) * limit;

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
        orderBy: { startAt: "desc" },
        skip,
        take: limit,
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
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
      items: rows.map((row) => serializeEvent(row)),
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
    const skip = (page - 1) * limit;

    // Upcoming events only: from now until the end of next week.
    // This includes the remainder of current week + full following week.
    const startOfWindow = new Date();
    const startOfCurrentWeek = new Date(startOfWindow);
    const day = startOfCurrentWeek.getDay();
    const diffToMonday = (day + 6) % 7;
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - diffToMonday);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const endOfWindow = new Date(startOfCurrentWeek);
    endOfWindow.setDate(endOfWindow.getDate() + 14);

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
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
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
      items: rows.map((row) => serializeEvent(row)),
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
  ): Promise<ReturnType<typeof serializeEvent> | null> {
    const row = await prisma.event.findUnique({
      where: { id },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
    return row ? serializeEvent(row) : null;
  }

  public async create(data: EventCreateInput) {
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
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
      });
    });
    return serializeEvent(row);
  }

  public async update(id: string, data: EventUpdateInput) {
    const { rawPayload, tiers, ...rest } = data;
    const patch: Prisma.EventUncheckedUpdateInput = {
      ...rest,
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
        include: { tiers: { orderBy: { sortOrder: "asc" } } },
      });
    });
    return serializeEvent(row);
  }

  public async delete(id: string): Promise<EventModel> {
    return prisma.event.delete({ where: { id } });
  }
}

const eventsService = new EventsService();

export default eventsService;
