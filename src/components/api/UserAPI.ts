import APIService from "@/components/api/APIService";

class APIUser {
  public static login(username: string, password: string) {
    const params = {
      data: {
        username: username,
        password: password,
      },
    };
    return APIService.post("api/login", params);
  }

  public static verify() {
    APIService.setHeader();
    return APIService.post("api/verify", {});
  }
}

export default APIUser;
