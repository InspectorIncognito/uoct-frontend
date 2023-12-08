<script setup lang="ts">
import mapboxgl from "mapbox-gl";
import { onMounted } from "vue";
mapboxgl.accessToken = import.meta.env.MAPBOX_TOKEN;
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  flex: 1;
}
</style>
