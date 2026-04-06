import "dotenv/config";
import { load } from "cheerio";
import axios from "axios";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { mirrorRemoteImageToR2 } from "../lib/images/mirror-remote-image.js";
import { getR2PublicBaseUrl, isR2PublicUrl } from "../lib/storage/r2.js";

// Import extractImageUrl logic directly to avoid importing shared.ts which imports brightdata.ts
const extractImageUrl = ($el: any) => {
  if (!$el) return null;

  const attributes = [
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-img-url",
    "data-src-retina",
    "src",
  ];

  for (const attr of attributes) {
    const val = typeof $el.attr === "function" ? $el.attr(attr) : null;
    if (val && !val.startsWith("data:image/")) {
      return val;
    }
  }

  return (typeof $el.attr === "function" ? $el.attr("src") : null) || null;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/panoramax?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function backfillImages() {
  const forceAll = process.argv.includes("--all");
  const nullOnFailure = process.argv.includes("--null-on-failure");
  const r2PublicBaseUrl = getR2PublicBaseUrl();
  console.log(
    `Starting image backfill for ${forceAll ? "ALL events" : "events missing R2 images"}...`,
  );
  console.log(`Using R2 public base URL: ${r2PublicBaseUrl}`);
  console.log(`Null on failure: ${nullOnFailure ? "enabled" : "disabled"}`);

  const allEvents = await prisma.event.findMany({
    select: {
      id: true,
      sourceUrl: true,
      imageUrl: true,
      title: true,
      source: true,
    },
  });

  const events = forceAll
    ? allEvents
    : allEvents.filter((event) => !isR2PublicUrl(event.imageUrl));

  console.log(`Found ${events.length} events to check.`);

  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let mirroredCount = 0;
  let nulledCount = 0;

  const resolveAbsoluteUrl = (candidateUrl: string, eventSourceUrl: string) => {
    if (!candidateUrl.startsWith("/")) {
      return candidateUrl;
    }

    try {
      const url = new URL(eventSourceUrl);
      return `${url.protocol}//${url.host}${candidateUrl}`;
    } catch {
      return candidateUrl;
    }
  };

  for (const event of events) {
    try {
      console.log(`Checking [${event.id}] ${event.title}...`);

      if (isR2PublicUrl(event.imageUrl)) {
        console.log(`ℹ️ Image already mirrored for: ${event.title}`);
        skippedCount++;
        continue;
      }

      let candidateImageUrl =
        event.imageUrl &&
        !event.imageUrl.startsWith("data:image/") &&
        !isR2PublicUrl(event.imageUrl)
          ? event.imageUrl
          : null;

      if (!candidateImageUrl) {
        const response = await axios.get(event.sourceUrl, {
          timeout: 15000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const html = response.data;
        const $ = load(html);

        const selectors = [
          'meta[property="og:image"]',
          "img.event-image",
          "img.featured-image",
          ".event-detail img",
          "article img",
          "main img",
        ];

        for (const selector of selectors) {
          const $el = $(selector);
          if (selector.startsWith("meta")) {
            const content = $el.attr("content");
            if (content && !content.startsWith("data:image/")) {
              candidateImageUrl = content;
              break;
            }
          } else {
            const extracted = extractImageUrl($el.first());
            if (extracted) {
              candidateImageUrl = extracted;
              break;
            }
          }
        }
      }

      if (!candidateImageUrl) {
        if (nullOnFailure && event.imageUrl) {
          await prisma.event.update({
            where: { id: event.id },
            data: { imageUrl: null },
          });
          console.log(`⚠️ Cleared imageUrl because no candidate was found: ${event.title}`);
          updatedCount++;
          nulledCount++;
          continue;
        }

        console.log(`ℹ️ No image candidate found for: ${event.title}`);
        skippedCount++;
        continue;
      }

      candidateImageUrl = resolveAbsoluteUrl(candidateImageUrl, event.sourceUrl);
      const mirroredImageUrl = await mirrorRemoteImageToR2({
        imageUrl: candidateImageUrl,
        eventId: event.id,
        source: event.source,
        sourceUrl: event.sourceUrl,
      });

      if (mirroredImageUrl !== event.imageUrl) {
        await prisma.event.update({
          where: { id: event.id },
          data: { imageUrl: mirroredImageUrl },
        });
        console.log(`✅ Mirrored image for: ${event.title}`);
        updatedCount++;
        mirroredCount++;
      } else {
        console.log(`ℹ️ Image already mirrored for: ${event.title}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${event.sourceUrl}:`, error instanceof Error ? error.message : error);
      if (nullOnFailure && event.imageUrl && !isR2PublicUrl(event.imageUrl)) {
        await prisma.event.update({
          where: { id: event.id },
          data: { imageUrl: null },
        });
        console.log(`⚠️ Cleared imageUrl after failure: ${event.title}`);
        updatedCount++;
        nulledCount++;
      }
      errorCount++;
    }
  }

  console.log("\n--- Backfill Summary ---");
  console.log(`Total events checked: ${events.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Mirrored to R2: ${mirroredCount}`);
  console.log(`Set to null: ${nulledCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed/Errors: ${errorCount}`);
}

backfillImages()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
