<script setup lang="ts">
import MapAPI from "@/components/api/MapAPI";
import AlertPopup from "@/components/map/AlertPopup.vue";
import SegmentPopup from "@/components/map/SegmentPopup.vue";
import SpeedInfoComponent from "@/components/map/SpeedInfoComponent.vue";
import UpdateStatusComponent from "@/components/map/UpdateStatusComponent.vue";
import { Cron } from "croner";
import { ElNotification } from "element-plus";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { h, onMounted, ref, render } from "vue";

interface AlertData {
  coords: number[];
  key_value: string;
  useful: number;
  useless: number;
}

const COLOR_DATA = [
  { color: "#FF0000", info: "< 5 km/h" },
  { color: "#FF4000", info: "5 - 10 km/h" },
  { color: "#FF8000", info: "10 - 15 km/h" },
  { color: "#FFD700", info: "15 - 19 km/h" },
  { color: "#FFFF00", info: "19 - 21 km/h" },
  { color: "#02FE02", info: "21 - 25 km/h" },
  { color: "#008000", info: "25 - 30 km/h" },
  { color: "#0000FF", info: "> 30 km/h" },
  { color: "#DDDDDD", info: "Sin datos" },
];

const TEMPORAL_RANGE = 15;

const style = ref("mapbox://styles/mapbox/dark-v10");

const mapContainer = ref<HTMLElement>();
const map = ref<InstanceType<typeof mapboxgl.Map> | null>(null);
const popup = ref<InstanceType<typeof mapboxgl.Popup> | null>(null);
const currentGeoJson = ref<unknown>(null);

const geoJsonSourceId = "geojson-source";
const geoJsonLayerId = "geojson-layer";
const selectedGeoJsonSourceId = "selected-geojson-source";
const selectedGeoJsonLayerId = "selected-geojson-layer";

const currentDate = ref(new Date());

const markerList = ref<InstanceType<typeof mapboxgl.Marker>[]>([]);

function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/dark-v10",
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
  map.value.dragRotate.disable();
}

function parseTemporalSegment(idx: number) {
  if (!idx) return "";
  const startTime = idx * TEMPORAL_RANGE;
  const endTime = startTime + TEMPORAL_RANGE;

  const startHours = Math.floor(startTime / 60);
  const endHours = Math.floor(endTime / 60);
  const startMinutes = startTime % 60;
  const endMinutes = endTime % 60;

  const formatTime = (hours: number, minutes: number) => {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  const start = formatTime(startHours, startMinutes);
  const end = formatTime(endHours, endMinutes);

  return `${start} - ${end}`;
}
function getAlertPopupContent(
  keyValue: string,
  useful: number,
  useless: number
) {
  return h(AlertPopup, {
    keyValue: keyValue,
    useful: useful,
    useless: useless,
  });
}
function getPopupContent(feature: any) {
  const sequence = Number(feature.properties?.sequence);
  const shapeId = feature.properties?.shape_id;
  const speedValue = Number(feature.properties.speed);
  const historicSpeedValue = Number(feature.properties.historic_speed);
  const temporalRange = parseTemporalSegment(
    feature.properties.temporal_segment
  );

  return h(SegmentPopup, {
    sequence: sequence,
    shapeId: shapeId,
    speed: speedValue,
    historicSpeed: historicSpeedValue,
    temporalRange: temporalRange,
  });
}

function onFeatureClick(e: any) {
  const feature = e.features?.[0];
  if (!feature || !map.value) return;

  if (!popup.value) {
    popup.value = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: "custom-popup",
    });
  }
  const popupContent = document.createElement("div");
  const componentVNode = getPopupContent(feature);
  render(componentVNode, popupContent);
  popup.value.setDOMContent(popupContent);
  popup.value.setLngLat(e.lngLat).addTo(map.value);
  const source = map.value.getSource(selectedGeoJsonSourceId) as any;
  source?.setData({
    type: "FeatureCollection",
    features: [feature],
  });
}

function onMouseEnterFeature() {
  if (!map.value) return;
  map.value.getCanvas().style.cursor = "pointer";
}

function onMouseLeaveFeature() {
  if (!map.value) return;
  map.value.getCanvas().style.cursor = "";
}

async function updateGeoJson() {
  const response = await MapAPI.getMapData();
  const geojsonData = response.data.geojson;
  const alertData = response.data.alerts;

  if (!map.value) return;

  if (map.value.getSource(geoJsonSourceId)) {
    map.value.removeLayer(geoJsonLayerId);
    map.value.removeSource(geoJsonSourceId);
  }

  map.value.addSource(geoJsonSourceId, {
    type: "geojson",
    data: geojsonData,
  });

  map.value.addLayer({
    id: geoJsonLayerId,
    type: "line",
    source: geoJsonSourceId,
    paint: {
      // Use a continuous color interpolation based on the numeric `speed` property.
      // If `speed` is missing, fall back to a gray color (Sin datos).
      "line-color": [
        "case",
        ["has", "speed"],
        [
          "interpolate",
          ["linear"],
          ["get", "speed"],
          0,
          "#FF0000",
          5,
          "#FF4000",
          10,
          "#FF8000",
          15,
          "#FFD700",
          19,
          "#FFFF00",
          21,
          "#02FE02",
          25,
          "#008000",
          30,
          "#0000FF",
        ],
        "#DDDDDD",
      ],
      "line-width": 4,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  });

  if (!map.value.getSource(selectedGeoJsonSourceId)) {
    map.value.addSource(selectedGeoJsonSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }
  currentGeoJson.value = response.data;
  map.value.on("click", geoJsonLayerId, onFeatureClick);
  map.value.on("mouseenter", geoJsonLayerId, onMouseEnterFeature);
  map.value.on("mouseleave", geoJsonLayerId, onMouseLeaveFeature);

  alertData.forEach((data: AlertData) => {
    createMarker(data);
  });
}

function updateMap() {
  clearMarkers();
  updateGeoJson().then(() => {
    showMarkers();
    currentDate.value = new Date();
    ElNotification({
      title: "Alerta",
      message: "Mapa actualizado",
      type: "success",
    });
  });
}

function getTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function hideMarker(marker: InstanceType<typeof mapboxgl.Marker>) {
  marker.remove();
}

function showMarker(marker: InstanceType<typeof mapboxgl.Marker>) {
  if (!map.value) return;
  marker.addTo(map.value);
}

function createPopup(
  alertData: AlertData,
  marker: InstanceType<typeof mapboxgl.Marker>
) {
  const keyValue = alertData.key_value;
  const coords = alertData.coords;
  const useful = alertData.useful;
  const useless = alertData.useless;

  const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    className: "custom-popup",
  });
  const popupContent = document.createElement("div");
  const componentVNode = getAlertPopupContent(keyValue, useful, useless);
  render(componentVNode, popupContent);
  popup.setDOMContent(popupContent);
  popup.setLngLat(coords);
  hideMarker(marker);
  if (map.value) popup.addTo(map.value);
  popup.on("close", () => {
    showMarker(marker);
  });
}

function createMarker(alertData: AlertData) {
  const coords = alertData.coords;
  const marker = new mapboxgl.Marker({ color: "#FF4000" }).setLngLat(coords);
  marker.getElement().addEventListener("click", () => {
    createPopup(alertData, marker);
  });
  markerList.value.push(marker);
}

function showMarkers() {
  if (!map.value) return;
  markerList.value.forEach((marker) => {
    marker.addTo(map.value!);
  });
}

function clearMarkers() {
  markerList.value.forEach((marker) => {
    marker.getElement().remove();
  });
  markerList.value = [];
}

onMounted(() => {
  initializeMap();
  updateMap();
  Cron("59 0/15 * * * *", () => {
    updateMap();
  });
});
</script>
<template>
  <div ref="mapContainer" class="map-container">
    <UpdateStatusComponent
      :top="5"
      :date="currentDate"
      :content="[`Mapa actualizado a las ${getTime(currentDate)}`]"
    />
    <SpeedInfoComponent :colorData="COLOR_DATA" :top="30" />
  </div>
</template>

<style scoped>
.map-container {
  flex: 1;
  height: 100vh;
}

body {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}
</style>
