import { defineStore } from "pinia";
import JWTService from "@/components/api/JWTService";
import { computed, ref } from "vue";
import APIUser from "@/components/api/UserAPI";

export interface User {
  first_name: string;
  last_name: string;
  email: string;
}

export interface UserFromServer extends User {
  token: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref({
    first_name: "",
    last_name: "",
    email: "",
  });
  const isAuthenticated = ref(!!JWTService.getToken());

  const getEmail = computed(() => user.value.email);
  const getUsername = computed(() => `${user.value.first_name} ${user.value.last_name}`);

  function setAuth(userParam: UserFromServer) {
    const token = userParam.token;
    user.value = userParam;
    isAuthenticated.value = true;
    JWTService.saveToken(token);
  }

  function purgeAuth() {
    isAuthenticated.value = false;
    user.value = {} as User;
    JWTService.destroyToken();
  }

  function login(credentials: Credentials) {
    return new Promise<void>((resolve, reject) => {
      APIUser.login(credentials.username, credentials.password)
        .then(({ data }) => {
          setAuth(data);
          resolve(data);
        })
        .catch(({ response }) => {
          console.log(response.data);
          reject(response.data);
        });
    });
  }

  function verify() {
    if (JWTService.getToken()) {
      return new Promise<void>((resolve, reject) => {
        APIUser.verify()
          .then(({ data }) => {
            setAuth(data);
            resolve(data);
          })
          .catch(({ response }) => {
            console.log(response.data);
            reject(response.data);
          });
      });
    } else {
      purgeAuth();
    }
  }

  return { user, isAuthenticated, getEmail, getUsername, purgeAuth, login, verify };
});
