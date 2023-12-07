<template>
  <div class="about">
    <el-row justify="center">
      <h1>{{ t("about.title") }}</h1>
    </el-row>
    <el-row justify="center">
      <p>{{ t("about.content") }}</p>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
