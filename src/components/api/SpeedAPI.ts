import APIService from "@/components/api/APIService";

class SpeedAPI {
  public static getList(
    month: number,
    dayType: string | boolean,
    temporalSegment: number,
    page: number,
    endpoint: string
  ) {
    let slug = `?month=${month}&page=${page}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    if (temporalSegment !== -1) slug += `&temporalSegment=${temporalSegment}`;
    return APIService.get(endpoint, slug);
  }

  public static getSpeeds(month: number, dayType: string | boolean, temporalSegment: number, page: number) {
    return this.getList(month, dayType, temporalSegment, page, "geo/speeds");
  }

  public static getHistoricSpeeds(month: number, dayType: string | boolean, temporalSegment: number, page: number) {
    return this.getList(month, dayType, temporalSegment, page, "geo/historicSpeeds");
  }

  public static downloadCSV(month: number, dayType: string | boolean, temporalSegment: number, endpoint: string) {
    let slug = `?month=${month}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    if (temporalSegment !== -1) slug += `&temporalSegment=${temporalSegment}`;
    return APIService.get(endpoint, slug);
  }

  public static downloadHistoricSpeeds(month: number, dayType: string | boolean, temporalSegment: number) {
    return this.downloadCSV(month, dayType, temporalSegment, "geo/historicSpeeds/to_csv");
  }

  public static downloadSpeeds(month: number, dayType: string | boolean, temporalSegment: number) {
    return this.downloadCSV(month, dayType, temporalSegment, "geo/speeds/to_csv");
  }
}

export default SpeedAPI;
