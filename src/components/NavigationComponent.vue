<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { FORM_URL } from "@/config";
import NavigationButton from "@/components/navigation/NavigationButton.vue";

const authStore = useAuthStore();
const router = useRouter();
const signOut = () => {
  authStore.purgeAuth();
  router.push({ name: "login" });
};
</script>

<template>
  <div class="navigation">
    <div class="navigation-header">
      <div class="header-element">
        <span class="material-icons">near_me</span>
      </div>
    </div>
    <div class="navigation-content">
      <NavigationButton to="/map" icon="map" name="Mapa" />
      <NavigationButton to="/speeds" icon="query_stats" name="Velocidades" />
      <NavigationButton to="/historicSpeeds" icon="query_stats" name="Vel. Mensual" />
      <NavigationButton to="/configuration" icon="settings" name="Conf." />
      <NavigationButton external :to="FORM_URL" icon="priority_high" name="Alertas  " />
    </div>
    <div class="navigation-footer">
      <NavigationButton isButton :cb="signOut" icon="logout" />
    </div>
  </div>
</template>

<style scoped>
.navigation {
  font-family: "Inter", sans-serif;
  color: #f0ece5;
  background: #31304d;
  height: 100vh;
  align-content: flex-start;
  display: flex;
  flex-direction: column;
}
.navigation .navigation-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 10vh;
  border-bottom: 1px solid #606266;
  padding: 8px 0 8px 8px;
}

.navigation-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding-top: 24px;
  padding-left: 8px;
  padding-bottom: 16px;
}

.navigation-section span {
  font-size: 24px;
}

.navigation-footer {
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-bottom: 24px;
  font-size: 24px;
  justify-content: center;
  align-items: flex-end;
}
</style>
