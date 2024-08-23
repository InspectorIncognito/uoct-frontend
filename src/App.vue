<template>
  <el-container>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>

<!--
<template>
  <el-container>
    <el-header>
      <el-row :gutter="5">
        <el-col :span="2" :offset="9">
          <RouterLink to="/">{{ t("menu.home") }}</RouterLink>
        </el-col>
        <el-col :span="2">
          <RouterLink to="/about">{{ t("menu.about") }}</RouterLink>
        </el-col>
        <el-col :span="2">
          <template v-if="authStore.isAuthenticated">
            <a href="" @click="signOut">{{ t("menu.logout") }}</a>
          </template>
          <template v-else>
            <RouterLink to="/login">{{ t("menu.login") }}</RouterLink>
          </template>
        </el-col>
      </el-row>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
    <el-footer>
      <el-row justify="center">
        <div class="version">{{ t("version") }} {{ appVersion }}</div>
      </el-row>
    </el-footer>
  </el-container>
</template>
-->
<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useI18n } from "vue-i18n";
import NavigationComponent from "@/components/NavigationComponent.vue";

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();

const appVersion = import.meta.env.PACKAGE_VERSION;

const signOut = () => {
  authStore.purgeAuth();
  router.push({ name: "login" });
};
</script>

<style>
html,
body,
.el-main {
  margin: 0;
  padding: 0 !important;
  font-family: Roboto, serif;
}
</style>
