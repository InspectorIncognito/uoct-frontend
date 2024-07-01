import APIService from "@/components/api/APIService";

class SpeedAPI {
  public static getHistoricSpeeds(month: number, dayType: string | boolean) {
    let slug = `?month=${month}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    return APIService.get("geo/historicSpeeds", slug);
  }

  public static downloadHistoricSpeeds(month: number, dayType: string | boolean) {
    let slug = `?month=${month}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    return APIService.get("geo/historicSpeeds/to_csv", slug);
  }
}

export default SpeedAPI;
