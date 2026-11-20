<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useThemeStore } from "@/stores/theme";

// Instantiating the store applies the stored theme to <html>.
useThemeStore();
</script>
