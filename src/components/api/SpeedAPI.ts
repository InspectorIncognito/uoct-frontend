import APIService from "@/components/api/APIService";

class SpeedAPI {
  public static getHistoricSpeeds(month: number, dayType: string | boolean, temporalSegment: number, page: number) {
    let slug = `?month=${month}&page=${page}`;

    if (dayType !== false) slug += `&dayType=${dayType}`;
    if (temporalSegment !== -1) slug += `&temporalSegment=${temporalSegment}`;
    return APIService.get("geo/historicSpeeds", slug);
  }

  public static downloadHistoricSpeeds(month: number, dayType: string | boolean, temporalSegment: number) {
    let slug = `?month=${month}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    if (temporalSegment !== -1) slug += `&temporalSegment=${temporalSegment}`;
    return APIService.get("geo/historicSpeeds/to_csv", slug);
  }
}

export default SpeedAPI;
