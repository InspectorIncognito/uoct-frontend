import APIService from "@/components/api/APIService";

class MapAPI {
  public static async getMapData() {
    return APIService.get("geo/mapData");
  }
  public static get_all_gps() {
    return APIService.get("gps/create");
  }

  public static get_by_range(start: string, end: string, toGeojson = false) {
    const query = `?${start}&${end}`;
    let url = "gps/create";
    if (toGeojson) url += "/to_geojson";
    return APIService.get(url, query);
  }
}

export default MapAPI;
