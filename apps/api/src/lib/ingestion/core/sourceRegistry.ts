import {
  ingestChileCultura,
  type IngestChileCulturaOptions,
} from "../sources/chileCultura.js";
import { ingestAgendaMusical } from "../sources/agendaMusical.js";
import { ingestGam } from "../sources/gam.js";
import { ingestPuntoticket } from "../sources/puntoticket.js";
import { ingestTicketplus } from "../sources/ticketplus.js";
import type { IngestionResult, IngestSourceOptions } from "./shared.js";

export type SourceKey =
  | "chile-cultura"
  | "gam"
  | "agenda-musical"
  | "ticketplus"
  | "puntoticket";

type SourceIngestFn = (
  options?: IngestSourceOptions | IngestChileCulturaOptions,
) => Promise<IngestionResult | Awaited<ReturnType<typeof ingestChileCultura>>>;

export const sourceRegistry = {
  "chile-cultura": ingestChileCultura,
  gam: ingestGam,
  "agenda-musical": ingestAgendaMusical,
  ticketplus: ingestTicketplus,
  puntoticket: ingestPuntoticket,
} satisfies Record<SourceKey, SourceIngestFn>;

export const sourceKeys = Object.keys(sourceRegistry) as SourceKey[];
