/** Same semantics as legacy Chile Cultura ingest (year = current, UTC+3 offset). */
export function parseChileCulturaStartAt(
  dateText: string,
  timeText: string | null,
): Date {
  const match = dateText
    .toLowerCase()
    .match(/(?<day>\d{1,2})\s+(?<month>[a-záéíóú]+)/i);

  if (!match?.groups) {
    return new Date();
  }

  const monthMap: Record<string, number> = {
    ene: 0,
    enero: 0,
    feb: 1,
    febrero: 1,
    mar: 2,
    marzo: 2,
    abr: 3,
    abril: 3,
    may: 4,
    mayo: 4,
    jun: 5,
    junio: 5,
    jul: 6,
    julio: 6,
    ago: 7,
    agosto: 7,
    sep: 8,
    sept: 8,
    septiembre: 8,
    oct: 9,
    octubre: 9,
    nov: 10,
    noviembre: 10,
    dic: 11,
    diciembre: 11,
  };

  const year = new Date().getFullYear();
  const month = monthMap[match.groups.month];
  const day = Number(match.groups.day);

  const timeMatch = timeText?.match(/(?<hours>\d{1,2}):(?<minutes>\d{2})/);
  const hours = timeMatch?.groups?.hours ?? "00";
  const minutes = timeMatch?.groups?.minutes ?? "00";

  const parsedDate = new Date(
    Date.UTC(year, month ?? 0, day, Number(hours) + 3, Number(minutes)),
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
}
