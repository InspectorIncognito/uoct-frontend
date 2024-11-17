<script setup lang="ts">
defineProps({
  keyValue: String,
  useful: Number,
  useless: Number,
});
</script>

<template>
  <div class="segment-popup">
    <div class="header">Alerta de congestión</div>
    <div class="section-container">
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">info</span>
        </div>
        <div class="section-data">{{ keyValue }}</div>
      </div>
      <div class="metrics-container">
        <div class="metric">
          <span class="material-icons">thumb_up</span>
          <span>{{ useful }}</span>
        </div>

        <div class="metric">
          <span class="material-icons">thumb_down</span>
          <span>{{ useless }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
