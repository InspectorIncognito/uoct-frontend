<script setup lang="ts">
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { onMounted, ref } from "vue";
import GPSAPI from "@/components/api/GPSAPI";
import { get_datetime_format } from "@/utils/gps_utils";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const style = ref("mapbox://styles/mapbox/dark-v10");
const elSwitch = ref(false);

const mapContainer = ref<HTMLElement>();
const map = ref(null);
const mapData = ref({});
const date_range = ref([]);
onMounted(() => {
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: style.value,
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
});
const toggleView = () => {
  elSwitch.value = !elSwitch.value;
  style.value = elSwitch.value ? "mapbox://styles/mapbox/dark-v10" : "mapbox://styles/mapbox/streets-v12";
  map.value.setStyle(style.value);
};

function updateMap(newData: object) {
  new mapboxgl.Marker().setLngLat([-70.65387, -33.443018]).addTo(map.value);
}

function get_by_range() {
  if (date_range.value !== []) {
    const start_date: string = get_datetime_format(date_range.value[0]);
    const end_date: string = get_datetime_format(date_range.value[1]);
    console.log(start_date, end_date);
    GPSAPI.get_by_range(start_date, end_date, true)
      .then((response) => {
        updateMap(response.data);
        //console.log(mapData.value);
      })
      .catch((e) => {
        console.log(e);
      });
  } else console.log("Nada");
}
</script>
<template>
  <div>
    <el-date-picker
      v-model="date_range"
      type="datetimerange"
      start-placeholder="Fecha inicio"
      end-placeholder="Fecha fin"
    ></el-date-picker>
    <el-button :onclick="get_by_range"></el-button>
  </div>
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
