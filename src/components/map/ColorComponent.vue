<script setup lang="ts">
defineProps({
  color: String,
});
</script>

<template>
  <div class="color-component" :style="`background: ${color}`"></div>
</template>

<style scoped>
.color-component {
  height: 24px;
  width: 98px;
}
</style>
