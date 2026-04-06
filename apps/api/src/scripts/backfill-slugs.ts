import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { buildEventSlug } from "../lib/ingestion/core/shared.js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/panoramax?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function backfillSlugs() {
  const forceAll = process.argv.includes("--all");

  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      source: true,
      sourceEventId: true,
      sourceUrl: true,
      slug: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const filteredEvents = forceAll ? events : events.filter((event) => !event.slug);

  console.log(
    `Starting slug backfill for ${forceAll ? "all events" : "events missing slugs"}...`,
  );
  console.log(`Found ${filteredEvents.length} events to process.`);

  let updated = 0;

  for (const event of filteredEvents) {
    const slug = buildEventSlug({
      title: event.title,
      source: event.source,
      sourceEventId: event.sourceEventId,
      sourceUrl: event.sourceUrl,
    });

    if (event.slug === slug) {
      continue;
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { slug },
    });

    updated++;
  }

  console.log(`Updated ${updated} event slugs.`);
}

backfillSlugs()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
