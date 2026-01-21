import APIService from "@/components/api/APIService";
import { parseDateObject } from "@/utils/date_utils";

interface DownloadArgs {
  month?: number;
  startTime?: string;
  endTime?: string;
  temporalSegment: number;
  dayType: string | boolean;
  endpoint: string;
}

class SpeedAPI {
  public static getListByMonth(
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

  public static getListByDates(
    startTime: string,
    endTime: string,
    dayType: string | boolean,
    temporalSegment: number,
    page: number,
    endpoint: string,
    ordering?: string
  ) {
    let slug = `?startTime=${startTime}&endTime=${endTime}&page=${page}`;
    if (dayType !== false) slug += `&dayType=${dayType}`;
    if (temporalSegment !== -1) slug += `&temporalSegment=${temporalSegment}`;
    if (ordering) slug += `&ordering=${ordering}`;
    return APIService.get(endpoint, slug);
  }

  public static getSpeeds(
    startTime: Date,
    endTime: Date,
    dayType: string | boolean,
    temporalSegment: number,
    page: number,
    ordering?: string
  ) {
    const parsedStartTime = parseDateObject(startTime);
    const parsedEndTime = parseDateObject(endTime);
    return this.getListByDates(
      parsedStartTime,
      parsedEndTime,
      dayType,
      temporalSegment,
      page,
      "geo/speeds",
      ordering
    );
  }

  public static getHistoricSpeeds(
    month: number,
    dayType: string | boolean,
    temporalSegment: number,
    page: number
  ) {
    return this.getListByMonth(
      month,
      dayType,
      temporalSegment,
      page,
      "geo/historicSpeeds"
    );
  }

  public static downloadCSV(args: DownloadArgs) {
    const month = args.month;
    const startTime = args.startTime;
    const endTime = args.endTime;
    const temporalSegment = args.temporalSegment;
    const dayType = args.dayType;
    const endpoint = args.endpoint;
    let slug = "?";
    const query_params = [];
    if (month) {
      query_params.push(`month=${month}`);
    }
    if (startTime && endTime) {
      query_params.push(`startTime=${startTime}`);
      query_params.push(`endTime=${endTime}`);
    }
    if (dayType !== false) query_params.push(`dayType=${dayType}`);
    if (temporalSegment !== -1)
      query_params.push(`&temporalSegment=${temporalSegment}`);
    slug += query_params.join("&");
    return APIService.get(endpoint, slug);
  }

  public static downloadHistoricSpeeds(
    month: number,
    dayType: string | boolean,
    temporalSegment: number
  ) {
    const args: DownloadArgs = {
      month: month,
      dayType: dayType,
      temporalSegment: temporalSegment,
      endpoint: "geo/historicSpeeds/to_csv",
    };
    return this.downloadCSV(args);
  }

  public static downloadHistoricSpeedsLocal(
    month: number,
    dayType: string | boolean,
    temporalSegment: number
  ) {
    const args: DownloadArgs = {
      month: month,
      dayType: dayType,
      temporalSegment: temporalSegment,
      endpoint: "geo/historicSpeeds/to_csv_local",
    };
    return this.downloadCSV(args);
  }

  public static downloadSpeeds(
    startTime: Date,
    endTime: Date,
    dayType: string | boolean,
    temporalSegment: number
  ) {
    const parsedStartTime = parseDateObject(startTime);
    const parsedEndTime = parseDateObject(endTime);
    const args: DownloadArgs = {
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      dayType: dayType,
      temporalSegment: temporalSegment,
      endpoint: "geo/speeds/to_csv",
    };
    return this.downloadCSV(args);
  }

  public static downloadSpeedsLocal(
    startTime: Date,
    endTime: Date,
    dayType: string | boolean,
    temporalSegment: number
  ) {
    const parsedStartTime = parseDateObject(startTime);
    const parsedEndTime = parseDateObject(endTime);
    const args: DownloadArgs = {
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      dayType: dayType,
      temporalSegment: temporalSegment,
      endpoint: "geo/speeds/to_csv_local",
    };
    return this.downloadCSV(args);
  }
}

export default SpeedAPI;
