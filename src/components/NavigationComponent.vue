<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { FORM_URL } from "@/config";

const authStore = useAuthStore();
const router = useRouter();
const signOut = () => {
  authStore.purgeAuth();
  router.push({ name: "login" });
};
</script>

<template>
  <div class="navigation">
    <div class="navigation-main">
      <div class="navigation-header">
        <el-row class="navigation-top">
          <div class="section">
            <div class="title"></div>
            <span class="material-icons">near_me</span>
          </div>
          <el-button size="small" link class="back">
            <span class="material-icons">arrow_back_ios</span>
          </el-button>
        </el-row>
      </div>
      <div class="navigation-section">
        <el-row class="navigation-section">
          <el-col>
            <router-link to="/map">
              <el-button link id="map">
                <span class="material-icons">arrow_forward_ios</span>
                <span class="material-icons">map</span>
                <div class="section-label">Mapa</div>
              </el-button>
            </router-link>
          </el-col>
          <el-col>
            <router-link to="/speeds">
              <el-button link>
                <span class="material-icons">arrow_forward_ios</span>
                <span class="material-icons">query_stats</span>
                <div class="section-label">Velocidades</div>
              </el-button>
            </router-link>
          </el-col>
          <el-col>
            <router-link to="/historicSpeeds">
              <el-button link>
                <span class="material-icons">arrow_forward_ios</span>
                <span class="material-icons">query_stats</span>
                <div class="section-label">Histórico</div>
              </el-button>
            </router-link>
          </el-col>

          <el-col>
            <router-link to="/configuration">
              <el-button link>
                <span class="material-icons">arrow_forward_ios</span>
                <span class="material-icons">settings</span>
                <div class="section-label">Conf.</div>
              </el-button>
            </router-link>
          </el-col>
          <el-col>
            <a :href="FORM_URL" target="_blank">
              <el-button link>
                <span class="material-icons">arrow_forward_ios</span>
                <span class="material-icons">priority_high</span>
                <div class="section-label">Alertas</div>
              </el-button>
            </a>
          </el-col>
        </el-row>
      </div>
    </div>
    <div class="navigation-footer">
      <el-button @click="signOut" link>
        <span class="material-icons">logout</span>
      </el-button>
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
  justify-content: space-between;
  display: flex;
  flex-direction: column;
}
.navigation .navigation-top {
  border-bottom: 1px solid #606266;
  padding: 24px 0;
  display: flex;
  align-content: center;
  justify-content: space-between;
}
.navigation-top .section {
  display: flex;
  justify-content: center;
  padding-left: 16px;
  align-items: center;
}
.navigation-top .section .title {
  font-size: 32px;
}
.navigation-top .back {
  color: #f0ece5;
  --el-button-hover-link-text-color: #b6bbc4;
  --el-button-size: 16px;
  font-size: 16px;
  padding-right: 8px;
}
.navigation-section {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 8px;
  padding-bottom: 16px;
}
.navigation-section .el-col {
  padding-top: 16px;
}
.navigation-section span {
  font-size: 24px;
}
.navigation-section .el-button {
  color: #b6bbc4;
  --el-button-hover-link-text-color: #f0ece5;
  --el-button-active-color: #f0ece5;
}
.navigation-section .section-label {
  font-family: "Inter", sans-serif;
  font-size: 20px;
  font-weight: 600;
  margin-left: 8px;
}
.navigation-body {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}

.navigation-footer {
  display: flex;
  flex-direction: row;
  height: 80px;
  justify-content: center;
  font-size: 24px;
}
</style>
