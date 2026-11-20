/**
 * Bus volume behind a speed reading. The backend lists every bus that crossed
 * a segment in an interval as "service|plate" (active_services); the volume is
 * the number of distinct buses (plates) in that list.
 */

/** Normalizes active_services from mapData (array) or the CSV export ("a;b;c"). */
export function serviceEntries(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value) {
    if (value.startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return value.split(";").filter(Boolean);
  }
  return [];
}

/** Distinct bus identities in a list of entries (plate, or the raw entry when it has none). */
export function busIds(entries: string[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    const plate = entry.split("|")[1];
    ids.add(plate || entry);
  }
  return [...ids];
}

export function busVolume(value: unknown): number {
  return busIds(serviceEntries(value)).length;
}

export function busesLabel(n: number) {
  return `${n} bus${n === 1 ? "" : "es"}`;
}

/** Volume buckets shared by the Panel's histogram. */
export const VOLUME_BINS = [
  { min: 1, max: 1, label: "1 bus" },
  { min: 2, max: 3, label: "2–3" },
  { min: 4, max: 6, label: "4–6" },
  { min: 7, max: 10, label: "7–10" },
  { min: 11, max: Infinity, label: "≥ 11" },
];
