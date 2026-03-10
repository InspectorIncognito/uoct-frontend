import { useAuthStore } from "@/stores/auth";
import MainView from "@/views/MainView.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: MainView,
      children: [
        {
          path: "map",
          name: "map",
          component: () => import("../components/MapView.vue"),
        },
        {
          path: "/speeds",
          name: "speeds",
          component: () => import("../views/SpeedView.vue"),
        },
        {
          path: "/historicSpeeds",
          name: "historicSpeed",
          component: () => import("../views/HistoricSpeedView.vue"),
        },
        {
          path: "/configuration",
          name: "configuration",
          component: () => import("../views/Configuration.vue"),
        },
        {
          path: "/place-streets",
          name: "placeStreets",
          component: () => import("../views/PlaceStreetsFormView.vue"),
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
  ],
});

// Whether the session has already been verified this page load.
// Reset to false whenever purgeAuth() is called so the next navigation
// re-verifies from scratch.
let sessionVerified = false;
// Guard flag: register the purge callback only once.
let callbackRegistered = false;

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Register a callback on the store so that when purgeAuth() is called
  // (e.g. logout) we reset sessionVerified without creating a circular import.
  if (!callbackRegistered) {
    authStore.setOnPurgeCallback(() => {
      sessionVerified = false;
    });
    callbackRegistered = true;
  }

  // Only hit the network once per page load (or after logout).
  if (!sessionVerified) {
    try {
      await authStore.verify();
    } catch (error) {
      authStore.purgeAuth();
    }
    sessionVerified = true;
  }

  if (authStore.isAuthenticated || to.name === "login") {
    next();
    // Scroll page to top on every route change
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  } else {
    console.log("user is not authenticated");
    next({ name: "login" });
  }
});

export default router;
