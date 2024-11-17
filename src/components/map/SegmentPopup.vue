<script setup lang="ts">
defineProps({
  sequence: Number,
  shapeId: String,
  speed: Number,
  historicSpeed: Number,
  temporalRange: String,
});
</script>

<template>
  <div class="segment-popup">
    <div class="header">Shape {{ shapeId }} - Segmento {{ sequence }}</div>
    <div class="section-container">
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">schedule</span>
        </div>
        <div class="section-data">
          <span>{{ temporalRange }}</span>
        </div>
      </div>
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">directions_bus</span>
          <span class="material-icons">double_arrow</span>
        </div>
        <div class="section-data speed">
          <b>Velocidad:</b>
          <span>{{ speed ? `${speed} km/h` : "No registrada" }}</span>
        </div>
        <div class="section-data speed">
          <b>Histórico:</b>
          <span>{{ historicSpeed ? `${historicSpeed} km/h` : "No calculada" }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
