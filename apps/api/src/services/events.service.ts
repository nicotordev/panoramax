import { Prisma } from "../generated/prisma/client.js";
import type { EventModel } from "../generated/prisma/models/Event.js";
import { serializeEvent } from "../lib/events/serialize-event.js";
import { toPrismaJsonInput } from "../lib/prisma-json.js";
import { prisma } from "../lib/prisma.js";
import type {
  EventCreateInput,
  EventUpdateInput,
  ListEventsQuery,
} from "../lib/validation/events.schema.js";

function toCreateData(
  data: EventCreateInput,
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

    const [rows, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      items: rows.map((row) => serializeEvent(row)),
      total,
      page,
      limit,
    };
  }

  public async getById(
    id: string,
  ): Promise<ReturnType<typeof serializeEvent> | null> {
    const row = await prisma.event.findUnique({ where: { id } });
    return row ? serializeEvent(row) : null;
  }

  public async create(data: EventCreateInput) {
    const row = await prisma.event.create({
      data: toCreateData(data),
    });
    return serializeEvent(row);
  }

  public async update(id: string, data: EventUpdateInput) {
    const { rawPayload, ...rest } = data;
    const patch: Prisma.EventUncheckedUpdateInput = {
      ...rest,
      ...(rawPayload !== undefined
        ? { rawPayload: toPrismaJsonInput(rawPayload) }
        : {}),
    };
    const row = await prisma.event.update({
      where: { id },
      data: patch,
    });
    return serializeEvent(row);
  }

  public async delete(id: string): Promise<EventModel> {
    return prisma.event.delete({ where: { id } });
  }
}

const eventsService = new EventsService();

export default eventsService;
