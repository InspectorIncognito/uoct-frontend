<script setup lang="ts">
defineProps({
  cameraId: String,
});
</script>

<template>
  <div class="cam-popup">
    <header class="cp-head caps">
      <span class="material-icons" aria-hidden="true">videocam</span>
      Cámara CCTV
    </header>
    <div class="cp-body">
      <span class="caps cp-k">ID UOCT</span>
      <span class="cp-v num">{{ cameraId }}</span>
    </div>
  </div>
</template>

<style scoped>
.cam-popup {
  font-family: var(--font);
  color: var(--ink);
  min-width: 200px;
}
.cp-head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 8px var(--s-3);
  background: var(--tile-2);
  border-bottom: 1px solid var(--rule);
}
.cp-head .material-icons {
  font-size: 16px;
}
.cp-body {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--s-4);
  padding: var(--s-3);
}
.cp-k {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.cp-v {
  font-size: var(--t-title);
}
</style>
