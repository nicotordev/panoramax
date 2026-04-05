import { Prisma } from "../generated/prisma/client.js";

/**
 * Maps API/Zod JSON (undefined / null / object) to Prisma JSON inputs.
 * `null` becomes `Prisma.JsonNull` so the column is set to JSON null, not SQL NULL.
 */
export function toPrismaJsonInput(
  value: Record<string, unknown> | null | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}
