import APIService from "@/components/api/APIService";
import APIUser from "@/components/api/UserAPI";

class ThresholdAPI {
  public static get() {
    return APIService.get("alert-threshold");
  }
  public static update(new_threshold: number) {
    const params = {
      data: {
        threshold: new_threshold,
      },
    };
    return APIService.post("alert-threshold/", params);
  }
}
export default ThresholdAPI;
