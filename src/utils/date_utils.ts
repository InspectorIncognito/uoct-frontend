const TEMPORAL_RANGE = 15;
export const temporalSegmentRange = Math.floor(1440 / 15);
export const monthOptions = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export const dayTypeOptions = [
  { value: "L", label: "Laboral" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
  { value: false, label: "Todos" },
];
export function getDayType(day: number) {
  return day === 7 ? "D" : day === 6 ? "S" : "L";
}

export function getDayTypeIndex(dayType: string) {
  const dayTypes = ["L", "S", "D"];
  return dayTypes.indexOf(dayType);
}

export function parseTemporalSegment(idx: number) {
  if (!idx && idx !== 0) return "";
  const startTime = idx * TEMPORAL_RANGE;
  const endTime = startTime + TEMPORAL_RANGE;

  const startHours = Math.floor(startTime / 60);
  const endHours = Math.floor(endTime / 60);
  const startMinutes = startTime % 60;
  const endMinutes = endTime % 60;

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 24) {
      return "23:59";
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  const start = formatTime(startHours, startMinutes);
  const end = formatTime(endHours, endMinutes);

  return `${start} - ${end} (${idx})`;
}

export function parseDateObject(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
}

/**
 * Format a UTC timestamp (seconds or milliseconds) or ISO string into a
 * human-readable string in the specified IANA time zone (default America/Santiago).
 *
 * Accepts:
 *  - number (seconds since epoch or milliseconds)
 *  - string (ISO 8601 timestamp)
 *  - Date object
 *
 * Returns a localized string like "2025-10-03 14:30:00"
 *
 * Examples:
 *  formatUTCToZone(1696348800) // "2023-10-03 12:00:00" (assuming seconds)
 *  formatUTCToZone(1696348800000) // "2023-10-03 12:00:00" (assuming ms)
 *  formatUTCToZone("2023-10-03T15:00:00Z") // "2023-10-03 12:00:00" (UTC-3 during summer)
 *  formatUTCToZone(new Date(), "America/New_York") // custom timezone
 */
export function formatUTCToZone(
  value: number | string | Date,
  timeZone = "America/Santiago"
) {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    // Heuristic: if value looks like seconds (<= 1e12) treat as seconds
    const asMs = value > 1e12 ? value : value * 1000;
    date = new Date(asMs);
  } else if (typeof value === "string") {
    // ISO string (assumed UTC if ends with Z) or other parsable format
    date = new Date(value);
  } else {
    return "";
  }

  // Intl.DateTimeFormat with timeZone handles DST correctly
  const dtf = new Intl.DateTimeFormat("es-CL", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Format produces e.g. 03/10/2025 14:30:00 — normalize to YYYY-MM-DD HH:mm:ss
  const parts = dtf.formatToParts(date).reduce((acc: any, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  // parts: { day, month, year, hour, minute, second }
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
