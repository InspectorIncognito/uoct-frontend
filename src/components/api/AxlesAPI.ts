import APIService from "@/components/api/APIService";

// NOTE: Assumes backend exposes endpoint POST /axles/ to create a new axle (axis)
// Data shape expected: { name: string, streets: string[], city: string }
// Adjust RESOURCE constant or payload if your backend differs (e.g., 'axes' instead of 'axles').

const RESOURCE = "geo/axles/"; // change to 'axes' if your backend uses that naming

export interface AxlePayload {
  name: string;
  streets: string[];
  city: string;
}

class AxlesAPI {
  public static create(payload: AxlePayload) {
    APIService.setHeader();
    const params = { data: payload };
    return APIService.post(RESOURCE, params);
  }
}

export default AxlesAPI;
