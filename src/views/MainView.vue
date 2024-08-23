<script setup lang="ts">
import NavigationComponent from "@/components/NavigationComponent.vue";
import { RouterView, useRouter } from "vue-router";
import { onMounted } from "vue";

const router = useRouter();
onMounted(() => {
  router.push({ name: "map" });
});
</script>

<template>
  <el-container>
    <el-aside width="200px"><NavigationComponent /></el-aside>
    <el-main><RouterView /></el-main>
  </el-container>
</template>

<style scoped></style>
