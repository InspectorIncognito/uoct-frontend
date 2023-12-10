<script setup lang="ts">
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { onMounted, ref } from "vue";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const style = ref("mapbox://styles/mapbox/streets-v12");
const elSwitch = ref(false);

const mapContainer = ref<HTMLElement>();
let map;
onMounted(() => {
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: style.value,
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
});
const toggleView = () => {
  elSwitch.value = !elSwitch.value;
  style.value = elSwitch.value ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";
  map.setStyle(style.value);
};
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  flex: 1;
  height: 100vh;
}
body {
  margin: 0;
  padding: 0;
}
</style>
