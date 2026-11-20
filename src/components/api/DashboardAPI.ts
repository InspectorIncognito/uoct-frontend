import APIService from "@/components/api/APIService";

/** Format a Date as the backend's UTC query format (%Y-%m-%dT%H:%M:%SZ). */
export function toUTCQuery(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

class DashboardAPI {
  /** GPS pulses of the current interval (or only the last recorded minute), one Feature per pulse. */
  public static getPulses(lastMinute = false) {
    return APIService.get("gtfs_rt/pulses/to_geojson", lastMinute ? "?last_minute=true" : "");
  }

  public static getShapesPage(page: number) {
    return APIService.get("geo/shape", `?page=${page}`);
  }

  /** Per-segment speeds between two instants, as CSV (UTC temporal index). */
  public static getSpeedsCSV(start: Date, end: Date) {
    const slug = `?startTime=${toUTCQuery(start)}&endTime=${toUTCQuery(end)}`;
    return APIService.get("geo/speeds/to_csv", slug);
  }

  /** Per-segment historic speeds of one month and day type, as CSV. */
  public static getHistoricCSV(month: number, dayType: string) {
    return APIService.get("geo/historicSpeeds/to_csv", `?month=${month}&dayType=${dayType}`);
  }
}

export default DashboardAPI;
