// Length of a temporal segment in minutes. Must match the backend's TEMPORAL_SEGMENT_MINUTES.
export const TEMPORAL_RANGE = 7.5;
export const temporalSegmentRange = Math.floor(1440 / TEMPORAL_RANGE);
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

  // "HH:MM", or "HH:MM:SS" when the instant is not on a whole minute.
  const formatTime = (minutes: number) => {
    if (minutes >= 1440) return "23:59";
    const total = Math.round(minutes * 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    const hms = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
    return (hms[2] ? hms : hms.slice(0, 2)).map(pad).join(":");
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)} (${idx})`;
}

export function parseDateObject(date: Date) {
  // The instant in UTC, "YYYY-MM-DDTHH:MM:SSZ" (what the backend expects).
  return date.toISOString().slice(0, 19) + "Z";
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
  timeZone = "America/Santiago",
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

/**
 * Compute temporal segment index (0..N-1) for a given UTC timestamp
 * but mapped to the target timeZone's local time.
 * Example: if the backend computed segment indices in UTC, use this to
 * compute the corresponding local segment index in America/Santiago.
 */
export function temporalSegmentFromTimestamp(
  value: number | string | Date,
  timeZone = "America/Santiago",
  range = TEMPORAL_RANGE,
) {
  // Reuse the same heuristics for epoch detection
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    const asMs = value > 1e12 ? value : value * 1000;
    date = new Date(asMs);
  } else {
    date = new Date(value);
  }

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  const hour = Number(parts.hour || "0");
  const minute = Number(parts.minute || "0");
  const second = Number(parts.second || "0");
  const minutesSinceMid = hour * 60 + minute + second / 60;
  const idx = Math.floor(minutesSinceMid / range);
  const total = Math.floor(1440 / range);
  return ((idx % total) + total) % total;
}

/**
 * Offset in segments between America/Santiago (or `timeZone`) and UTC on
 * `referenceDate`, which resolves DST (e.g. the date or month being queried).
 */
function localOffsetSegments(referenceDate: Date, timeZone: string, range: number) {
  // Offset in minutes between UTC midnight and local time at that UTC midnight
  const utcMidMs = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
  );
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date(utcMidMs)).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  const localDay = Number(parts.day);
  const localHour = Number(parts.hour || "0");
  const localMinute = Number(parts.minute || "0");

  const utcDay = new Date(utcMidMs).getUTCDate();

  let offsetMinutes = localHour * 60 + localMinute;
  if (localDay < utcDay) offsetMinutes -= 1440;
  if (localDay > utcDay) offsetMinutes += 1440;

  return Math.round(offsetMinutes / range);
}

/** Convert a UTC temporal segment index into the local one (see localOffsetSegments). */
export function temporalSegmentFromUTCIndex(
  utcIndex: number,
  referenceDate: Date,
  timeZone = "America/Santiago",
  range = TEMPORAL_RANGE,
) {
  const total = Math.floor(1440 / range);
  const offset = localOffsetSegments(referenceDate, timeZone, range);
  return (((utcIndex + offset) % total) + total) % total;
}

/** Inverse of temporalSegmentFromUTCIndex; -1 ("all") is kept as is. */
export function temporalSegmentToUTCIndex(
  localIndex: number,
  referenceDate: Date,
  timeZone = "America/Santiago",
  range = TEMPORAL_RANGE,
) {
  if (localIndex < 0) return localIndex;
  const total = Math.floor(1440 / range);
  const offset = localOffsetSegments(referenceDate, timeZone, range);
  return (((localIndex - offset) % total) + total) % total;
}
