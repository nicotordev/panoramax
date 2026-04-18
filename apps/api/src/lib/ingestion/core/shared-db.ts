import { createHash } from "node:crypto";
import { Prisma } from "../../../generated/prisma/client.js";
import { mirrorRemoteImageToR2 } from "../../images/mirror-remote-image.js";
import { prisma } from "../../prisma.js";
import { toPrismaJsonInput } from "../../prisma-json.js";
import { isR2PublicUrl } from "../../storage/r2.js";
import type {
  EventCreateInput,
  EventTierInput,
} from "../../validation/events.schema.js";
import { buildEventSlug } from "./shared-pure.js";

function toEventUncheckedCreateInput(
  event: Omit<EventCreateInput, "tiers">,
): Prisma.EventUncheckedCreateInput {
  const {
    slug,
    categoriesSource,
    tags,
    editorialLabels,
    rawPayload,
    ...rest
  } = event;
  const resolvedSlug =
    slug ??
    buildEventSlug({
      title: event.title,
      source: event.source,
      sourceEventId: event.sourceEventId,
      sourceUrl: event.sourceUrl,
    });

  return {
    ...rest,
    slug: resolvedSlug,
    rawPayload: toPrismaJsonInput(rawPayload),
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    editorialLabels: editorialLabels ?? [],
  };
}

function toEventUncheckedUpdateInput(
  event: Omit<EventCreateInput, "tiers">,
): Prisma.EventUncheckedUpdateInput {
  const {
    slug,
    categoriesSource,
    tags,
    editorialLabels,
    rawPayload,
    ...rest
  } = event;

  return {
    ...rest,
    ...(slug ? { slug } : {}),
    rawPayload: toPrismaJsonInput(rawPayload),
    categoriesSource: categoriesSource ?? [],
    tags: tags ?? [],
    editorialLabels: editorialLabels ?? [],
  };
}

function buildSyntheticImageKey(event: Omit<EventCreateInput, "tiers">): string {
  const stableInput =
    event.sourceEventId ?? event.dedupeKey ?? `${event.source}:${event.sourceUrl}`;

  return createHash("sha256").update(stableInput).digest("hex").slice(0, 16);
}

async function resolveMirroredImageUrl(
  event: Omit<EventCreateInput, "tiers">,
): Promise<string | null> {
  const imageUrl = event.imageUrl;

  if (!imageUrl || imageUrl.startsWith("data:image/") || isR2PublicUrl(imageUrl)) {
    return imageUrl ?? null;
  }

  const existing = await prisma.event.findUnique({
    where: {
      source_sourceUrl: {
        source: event.source,
        sourceUrl: event.sourceUrl,
      },
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });

  try {
    return await mirrorRemoteImageToR2({
      imageUrl,
      eventId: existing?.id ?? buildSyntheticImageKey(event),
      source: event.source,
      sourceUrl: event.sourceUrl,
    });
  } catch (error) {
    console.warn(
      `Failed to mirror image for ${event.source} ${event.sourceUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    return existing?.imageUrl && isR2PublicUrl(existing.imageUrl)
      ? existing.imageUrl
      : null;
  }
}

export const upsertEvent = async (
  event: EventCreateInput & { tiers?: EventTierInput[] },
) => {
  const { tiers = [], ...eventData } = event;
  const imageUrl = await resolveMirroredImageUrl(eventData);

  return prisma.$transaction(async (tx) => {
    const saved = await tx.event.upsert({
      where: {
        source_sourceUrl: {
          source: event.source,
          sourceUrl: event.sourceUrl,
        },
      },
      create: toEventUncheckedCreateInput({
        ...eventData,
        imageUrl,
      }),
      update: {
        ...toEventUncheckedUpdateInput({
          ...eventData,
          imageUrl,
        }),
        lastSeenAt: new Date(),
      },
    });

    await tx.eventTier.deleteMany({
      where: { eventId: saved.id },
    });

    if (tiers.length > 0) {
      await tx.eventTier.createMany({
        data: tiers.map((tier, index) => ({
          eventId: saved.id,
          name: tier.name,
          price: tier.price ?? null,
          fee: tier.fee ?? null,
          totalPrice: tier.totalPrice ?? null,
          currency: tier.currency ?? "CLP",
          sortOrder: tier.sortOrder ?? index,
          rawText: tier.rawText ?? null,
        })),
      });
    }

    return tx.event.findUniqueOrThrow({
      where: { id: saved.id },
      include: { tiers: { orderBy: { sortOrder: "asc" } } },
    });
  });
};

export const scrapeEventPages = async (urls: string[]) => {
  const { scrapeHtml } = await import("../../brightdata.js");
  return Promise.all(urls.map((url) => scrapeHtml(url)));
};
