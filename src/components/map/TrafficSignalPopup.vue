<script setup lang="ts">
defineProps({
  osmId: String,
  intersectingWays: [Number, String],
});
</script>

<template>
  <div class="traffic-signal-popup">
    <div class="header">
      <span class="material-icons">traffic</span>
      Semáforo
    </div>
    <div class="section-container">
      <div class="section">
        <div class="section-label">OSM ID:</div>
        <div class="section-data">{{ osmId }}</div>
      </div>
      <div class="section" v-if="intersectingWays">
        <div class="section-label">Vías conectadas:</div>
        <div class="section-data">{{ intersectingWays }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.traffic-signal-popup {
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
  color: #e74c3c;
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
