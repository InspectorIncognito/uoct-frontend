<template>
  <div class="home">
    <el-row justify="center">
      <h1>{{ t("home.title") }}</h1>
    </el-row>
    <el-row justify="center">
      <p>{{ t("home.content") }}</p>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
