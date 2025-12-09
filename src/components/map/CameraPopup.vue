<script setup lang="ts">
defineProps({
  cameraId: String,
});
</script>

<template>
  <div class="camera-popup">
    <div class="header">
      <span class="material-icons">videocam</span>
      Cámara
    </div>
    <div class="section-container">
      <div class="section">
        <div class="section-label">ID:</div>
        <div class="section-data">{{ cameraId }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-popup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  min-width: 150px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.header .material-icons {
  font-size: 18px;
  color: #ff4000;
}

.section-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-label {
  font-weight: 600;
  color: #666;
  font-size: 12px;
}

.section-data {
  font-size: 12px;
  color: #333;
}
</style>
