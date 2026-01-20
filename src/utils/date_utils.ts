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

/**
 * Get day type (L, S, D) from a Date object in a specific timezone.
 * Handles edge cases where UTC 00:00-03:00 on Mon/Sat/Sun maps to previous day in Santiago.
 *
 * @param date - Date object or timestamp
 * @param timeZone - IANA timezone (default: America/Santiago)
 * @returns 'L' for weekday (Mon-Fri), 'S' for Saturday, 'D' for Sunday
 */
export function getDayTypeFromDate(
  value: number | string | Date,
  timeZone = "America/Santiago",
): string {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    const asMs = value > 1e12 ? value : value * 1000;
    date = new Date(asMs);
  } else if (typeof value === "string") {
    date = new Date(value);
  } else {
    return "L";
  }

  // Get day of week in the target timezone
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });

  const weekday = dtf.format(date);

  // Map weekday to day type
  // Sun = 0, Mon = 1, ..., Sat = 6 (JS convention)
  // But Intl gives us the name, so we map it
  switch (weekday) {
    case "Sun":
      return "D";
    case "Sat":
      return "S";
    default:
      return "L";
  }
}

/**
 * Calculate temporal segment index from a timestamp in the local timezone.
 * This recalculates the segment based on the local hour and minute.
 *
 * @param value - timestamp (number, string, or Date)
 * @param timeZone - IANA timezone (default: America/Santiago)
 * @param range - minutes per segment (default: 15)
 * @returns segment index 0-95
 */
export function getTemporalSegmentFromTimestamp(
  value: number | string | Date,
  timeZone = "America/Santiago",
  range = TEMPORAL_RANGE,
): number {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    const asMs = value > 1e12 ? value : value * 1000;
    date = new Date(asMs);
  } else if (typeof value === "string") {
    date = new Date(value);
  } else {
    return 0;
  }

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  const hour = Number(parts.hour || "0");
  const minute = Number(parts.minute || "0");
  const minutesSinceMidnight = hour * 60 + minute;

  return Math.floor(minutesSinceMidnight / range);
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
      "0",
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
    day: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  const hour = Number(parts.hour || "0");
  const minute = Number(parts.minute || "0");
  const minutesSinceMid = hour * 60 + minute;
  const idx = Math.floor(minutesSinceMid / range);
  const total = Math.floor(1440 / range);
  return ((idx % total) + total) % total;
}

/**
 * Convert a temporal segment index computed for UTC into the equivalent
 * temporal segment index in the given timeZone, using a reference date to
 * resolve DST (e.g., use the month/day being queried).
 *
 * referenceDate: Date object indicating which date's UTC->local offset to use
 */
export function temporalSegmentFromUTCIndex(
  utcIndex: number,
  referenceDate: Date,
  timeZone = "America/Santiago",
  range = TEMPORAL_RANGE,
) {
  const total = Math.floor(1440 / range);

  // Compute offset in minutes between UTC midnight and local time at that UTC midnight
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

  const offsetSegments = Math.round(offsetMinutes / range);

  let localIndex = (utcIndex + offsetSegments) % total;
  if (localIndex < 0) localIndex += total;
  return localIndex;
}
