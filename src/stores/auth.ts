import JWTService from "@/components/api/JWTService";
import APIUser from "@/components/api/UserAPI";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

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
  const user = ref<User>({
    first_name: "",
    last_name: "",
    email: "",
  });
  const isAuthenticated = ref(!!JWTService.getToken());

  const getEmail = computed(() => user.value.email);
  const getUsername = computed(
    () => `${user.value.first_name} ${user.value.last_name}`
  );

  // Optional callback invoked by the router to reset its session-verified flag
  // when purgeAuth() is called, without creating a circular import.
  let onPurgeCallback: (() => void) | null = null;

  function setOnPurgeCallback(cb: () => void) {
    onPurgeCallback = cb;
  }

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
    onPurgeCallback?.();
  }

  function login(credentials: Credentials) {
    return new Promise<void>((resolve, reject) => {
      APIUser.login(credentials.username, credentials.password)
        .then(({ data }) => {
          setAuth(data);
          resolve(data);
        })
        .catch((error) => {
          const msg = error?.response?.data ?? error?.message;
          console.log(msg);
          reject(msg);
        });
    });
  }

  function verify(): Promise<void> {
    if (JWTService.getToken()) {
      return new Promise<void>((resolve, reject) => {
        APIUser.verify()
          .then(({ data }) => {
            setAuth(data);
            resolve(data);
          })
          .catch((error) => {
            const msg = error?.response?.data ?? error?.message;
            console.log(msg);
            reject(msg);
          });
      });
    } else {
      purgeAuth();
      return Promise.resolve();
    }
  }

  return {
    user,
    isAuthenticated,
    getEmail,
    getUsername,
    purgeAuth,
    setOnPurgeCallback,
    login,
    verify,
  };
});
