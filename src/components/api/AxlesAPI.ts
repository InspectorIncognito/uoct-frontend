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

export interface ProcessAxisPayload {
  axis_name: string;
  distance_threshold?: number;
}

export interface Axle {
  id: number;
  name: string;
  streets: string[];
  city: string;
  has_shapes: boolean;
  shapes_count: number;
}

export interface DeleteAxleResponse {
  status: string;
  message: string;
  deleted: {
    shapes: number;
    segments: number;
    speeds: number;
    historic_speeds: number;
    alerts: number;
    services: number;
    stops: number;
    cameras: number;
    traffic_signals: number;
  };
}

class AxlesAPI {
  public static create(payload: AxlePayload) {
    APIService.setHeader();
    const params = { data: payload };
    return APIService.post(RESOURCE, params);
  }

  /**
   * Triggers the Django management command 'add_single_axis' to process
   * the axis geometry from OpenStreetMap data.
   * @param payload - axis_name (required), distance_threshold (optional, default 500.0)
   */
  public static processAxis(payload: ProcessAxisPayload) {
    APIService.setHeader();
    const params = { data: payload };
    return APIService.post(`${RESOURCE}process/`, params);
  }

  /**
   * Get all axles from the backend.
   * @returns Promise with array of Axle objects
   */
  public static getAll() {
    APIService.setHeader();
    // Use query to avoid double slash issue with get method
    return APIService.query(RESOURCE, {});
  }

  /**
   * Delete an axle by ID. This will also delete all associated shapes,
   * segments, speeds, alerts, etc.
   * @param id - The ID of the axle to delete
   */
  public static delete(id: number) {
    APIService.setHeader();
    return APIService.delete(`${RESOURCE}${id}/`);
  }
}

export default AxlesAPI;
