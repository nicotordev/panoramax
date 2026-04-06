import { z } from "zod";
import {
  Audience,
  CategoryPrimary,
  EventStatus,
  SourceType,
} from "../../generated/prisma/enums.js";

const decimalNullable = z.union([z.number(), z.string()]).nullish();
const eventTierSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1),
  price: decimalNullable,
  fee: decimalNullable,
  totalPrice: decimalNullable,
  currency: z.string().default("CLP"),
  sortOrder: z.number().int().nonnegative().optional(),
  rawText: z.string().nullish(),
});

const eventCoreSchema = z.object({
  id: z.uuid().optional(),
  source: z.string().min(1),
  sourceType: z.nativeEnum(SourceType),
  sourceEventId: z.string().nullish(),
  sourceUrl: z.string().min(1),
  slug: z.string().min(1).optional(),
  ticketUrl: z.string().nullish(),
  importedAt: z.coerce.date().optional(),
  lastSeenAt: z.coerce.date().optional(),
  rawTitle: z.string().nullish(),
  rawPayload: z.record(z.string(), z.unknown()).nullish(),
  title: z.string().min(1),
  subtitle: z.string().nullish(),
  summary: z.string().nullish(),
  description: z.string().nullish(),
  language: z.string().nullish(),
  imageUrl: z.string().nullish(),
  imageAttribution: z.string().nullish(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().nullish(),
  timezone: z.string().default("America/Santiago"),
  allDay: z.boolean().default(false),
  dateText: z.string().nullish(),
  status: z.nativeEnum(EventStatus).default(EventStatus.scheduled),
  venueName: z.string().min(1),
  venueRaw: z.string().nullish(),
  address: z.string().nullish(),
  commune: z.string().min(1),
  city: z.string().min(1),
  region: z.string().nullish(),
  country: z.string().default("CL"),
  latitude: decimalNullable,
  longitude: decimalNullable,
  isOnline: z.boolean().default(false),
  locationNotes: z.string().nullish(),
  isFree: z.boolean().default(false),
  priceMin: decimalNullable,
  priceMax: decimalNullable,
  currency: z.string().default("CLP"),
  priceText: z.string().nullish(),
  availabilityText: z.string().nullish(),
  tiers: z.array(eventTierSchema).optional(),
  categoryPrimary: z.nativeEnum(CategoryPrimary),
  categorySecondary: z.string().nullish(),
  categoriesSource: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  audience: z.nativeEnum(Audience).nullish(),
  editorialLabels: z.array(z.string()).optional(),
  dedupeKey: z.string().nullish(),
  canonicalEventId: z.uuid().nullish(),
  qualityScore: z.number().int().nullish(),
  needsReview: z.boolean().optional(),
  reviewNotes: z.string().nullish(),
});

export const eventCreateBodySchema = eventCoreSchema;

export const eventUpdateBodySchema = eventCoreSchema
  .partial()
  .superRefine((val, ctx) => {
    if (Object.keys(val).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one field is required",
        path: [],
      });
    }
  });

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  city: z.string().optional(),
  commune: z.string().optional(),
  region: z.string().optional(),
  source: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  categoryPrimary: z.nativeEnum(CategoryPrimary).optional(),
});

export const eventIdParamSchema = z.object({
  id: z.uuid(),
});

export type EventCreateInput = z.infer<typeof eventCreateBodySchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateBodySchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type EventTierInput = z.infer<typeof eventTierSchema>;
