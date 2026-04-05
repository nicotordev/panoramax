import { Prisma } from "../../generated/prisma/client.js";

type EventWithTiers = Prisma.EventGetPayload<{
  include: { tiers: { orderBy: { sortOrder: "asc" } } };
}>;

export function serializeEvent(event: EventWithTiers) {
  return {
    ...event,
    latitude: event.latitude != null ? String(event.latitude) : null,
    longitude: event.longitude != null ? String(event.longitude) : null,
    priceMin: event.priceMin != null ? String(event.priceMin) : null,
    priceMax: event.priceMax != null ? String(event.priceMax) : null,
    tiers: event.tiers.map((tier) => ({
      ...tier,
      price: tier.price != null ? String(tier.price) : null,
      fee: tier.fee != null ? String(tier.fee) : null,
      totalPrice: tier.totalPrice != null ? String(tier.totalPrice) : null,
    })),
  };
}
