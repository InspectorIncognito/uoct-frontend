import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import MainView from "@/views/MainView.vue";

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
          path: "/historicSpeeds",
          name: "historicSpeed",
          component: () => import("../views/HistoricSpeedView.vue"),
        },
        {
          path: "/configuration",
          name: "configuration",
          component: () => import("../views/Configuration.vue"),
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

router.beforeEach(async (to, from, next) => {
  // check user session
  const authStore = useAuthStore();
  try {
    await authStore.verify();
  } catch (error) {
    authStore.purgeAuth();
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
