import type { App } from "vue";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import JWTService from "@/components/api/JWTService";
import VueAxios from "vue-axios";

/**
 * @description service to call HTTP request via Axios
 */
class APIService {
  /**
   * @description property to share vue instance
   */
  public static vueInstance: App;

  /**
   * @description initialize vue axios
   */
  public static init(app: App<Element>) {
    APIService.vueInstance = app;
    APIService.vueInstance.use(VueAxios, axios);
    APIService.vueInstance.axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;
  }

  /**
   * @description set the default HTTP request headers
   */
  public static setHeader(): void {
    APIService.vueInstance.axios.defaults.headers.common["Authorization"] = `Token ${JWTService.getToken()}`;
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static query(resource: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.get(resource, params);
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param slug: string
   * @returns Promise<AxiosResponse>
   */
  public static get(resource: string, slug = "" as string): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.get(`${resource}/${slug}`);
  }

  /**
   * @description set the POST HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static post(resource: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.post(`${resource}`, params.data, params);
  }

  /**
   * @description set the POST files HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static postWithFiles(resource: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.post(`${resource}`, params.params, params);
  }

  /**
   * @description send the UPDATE HTTP request
   * @param resource: string
   * @param slug: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static update(resource: string, slug: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.put(`${resource}/${slug}`, params);
  }

  /**
   * @description Send the PUT HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static put(resource: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.put(`${resource}`, params);
  }

  /**
   * @description Send the PATCH HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static patch(resource: string, params: AxiosRequestConfig): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.patch(`${resource}`, params);
  }

  /**
   * @description Send the DELETE HTTP request
   * @param resource: string
   * @returns Promise<AxiosResponse>
   */
  public static delete(resource: string): Promise<AxiosResponse> {
    return APIService.vueInstance.axios.delete(resource);
  }
}

export default APIService;
