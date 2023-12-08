<template>
  <el-container>
    <el-main> <MapView /> </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MapView from "@/components/MapView.vue";

const { t } = useI18n();
</script>
