<script setup lang="ts">
import MapAPI from "@/components/api/MapAPI";
import AlertPopup from "@/components/map/AlertPopup.vue";
import CameraPopup from "@/components/map/CameraPopup.vue";
import SegmentPopup from "@/components/map/SegmentPopup.vue";
import SpeedInfoComponent from "@/components/map/SpeedInfoComponent.vue";
import UpdateStatusComponent from "@/components/map/UpdateStatusComponent.vue";
import {
  parseTemporalSegment,
  temporalSegmentFromUTCIndex,
} from "@/utils/date_utils";
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

interface CameraData {
  camera_id: string;
  latitude: number;
  longitude: number;
}

const COLOR_DATA = [
  { color: "#D32F2F", info: "< 5 km/h" },
  { color: "#F57C00", info: "5 - 10 km/h" },
  { color: "#FFB300", info: "10 - 15 km/h" },
  { color: "#FDD835", info: "15 - 19 km/h" },
  { color: "#CDDC39", info: "19 - 21 km/h" },
  { color: "#8BC34A", info: "21 - 25 km/h" },
  { color: "#43A047", info: "25 - 30 km/h" },
  { color: "#1B5E20", info: "> 30 km/h" },
  { color: "#DDDDDD", info: "Sin datos" },
];

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
const cameraMarkerList = ref<InstanceType<typeof mapboxgl.Marker>[]>([]);

// Camera SVG icon (returns SVG with dynamic size)
function getCameraSvgIcon(width: number, height: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 79 51" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M50.0417 21.25V36.8333C50.0417 37.1124 49.9867 37.3887 49.8799 37.6465C49.7731 37.9044 49.6166 38.1386 49.4193 38.3359C49.2219 38.5333 48.9877 38.6898 48.7299 38.7966C48.472 38.9034 48.1957 38.9583 47.9167 38.9583H9.66666C9.3876 38.9583 9.11127 38.9034 8.85345 38.7966C8.59564 38.6898 8.36138 38.5333 8.16405 38.3359C7.96673 38.1386 7.8102 37.9044 7.70341 37.6465C7.59662 37.3887 7.54166 37.1124 7.54166 36.8333V5.66667C7.54166 5.10308 7.76554 4.56258 8.16405 4.16406C8.56257 3.76555 9.10307 3.54167 9.66666 3.54167H47.9167C48.4802 3.54167 49.0207 3.76555 49.4193 4.16406C49.8178 4.56258 50.0417 5.10308 50.0417 5.66667V21.25ZM50.0417 21.25L67.8067 6.44583C68.117 6.18738 68.4945 6.02269 68.895 5.97106C69.2955 5.91944 69.7025 5.98301 70.0682 6.15434C70.4339 6.32567 70.7432 6.59765 70.9599 6.93844C71.1765 7.27923 71.2916 7.6747 71.2917 8.07854V34.4215C71.291 34.825 71.1754 35.22 70.9584 35.5603C70.7415 35.9005 70.4321 36.172 70.0666 36.3429C69.701 36.5138 69.2943 36.577 68.8941 36.5253C68.4939 36.4735 68.1167 36.3089 67.8067 36.0506L50.0417 21.25Z" fill="#3B5B97" stroke="#3B5B97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Calculate camera icon size based on zoom level
function getCameraIconSize(zoom: number): { width: number; height: number } {
  // Base size at zoom 14, scales proportionally
  const baseZoom = 14;
  const baseWidth = 24;
  const baseHeight = 16;
  const scale = Math.pow(2, zoom - baseZoom);
  // Clamp scale between 0.25 and 2 to avoid too small or too large icons
  const clampedScale = Math.max(0.25, Math.min(2, scale));
  return {
    width: Math.round(baseWidth * clampedScale),
    height: Math.round(baseHeight * clampedScale),
  };
}

function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: "mapbox://styles/mapbox/dark-v10",
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
  map.value.dragRotate.disable();

  // Update camera marker sizes when zoom changes
  map.value.on("zoom", () => {
    updateCameraMarkerSizes();
  });
}

function formatTemporalSegmentToSantiago(utcIdx: number) {
  if (!utcIdx && utcIdx !== 0) return "";

  // Convert UTC temporal segment index to Santiago timezone
  const referenceDate = new Date();
  const localIdx = temporalSegmentFromUTCIndex(utcIdx, referenceDate);

  // Format the local temporal segment
  return parseTemporalSegment(localIdx);
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

function getCameraPopupContent(cameraId: string) {
  return h(CameraPopup, {
    cameraId: cameraId,
  });
}

function getPopupContent(feature: any) {
  const sequence = Number(feature.properties?.sequence);
  const shapeId = feature.properties?.shape_id;
  const speedValue = Number(feature.properties.speed);
  const historicSpeedValue = Number(feature.properties.historic_speed);
  const temporalRange = formatTemporalSegmentToSantiago(
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
      // Use the color property from the backend data.
      // If `color` is missing, fall back to a gray color (Sin datos).
      "line-color": ["coalesce", ["get", "color"], "#DDDDDD"],
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

// Camera marker functions
function createCameraMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  const zoom = map.value?.getZoom() || 14;
  const { width, height } = getCameraIconSize(zoom);
  el.innerHTML = getCameraSvgIcon(width, height);
  el.style.cursor = "pointer";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.classList.add("camera-marker");
  return el;
}

// Update all camera marker sizes based on current zoom
function updateCameraMarkerSizes() {
  if (!map.value) return;
  const zoom = map.value.getZoom();
  const { width, height } = getCameraIconSize(zoom);
  cameraMarkerList.value.forEach((marker) => {
    const el = marker.getElement();
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
    }
  });
}

function createCameraMarker(cameraData: CameraData) {
  const coords: [number, number] = [cameraData.longitude, cameraData.latitude];
  const el = createCameraMarkerElement();

  const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords);

  // Create popup for hover
  const cameraPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "camera-popup",
    offset: 25,
  });

  el.addEventListener("mouseenter", () => {
    if (!map.value) return;
    const popupContent = document.createElement("div");
    const componentVNode = getCameraPopupContent(cameraData.camera_id);
    render(componentVNode, popupContent);
    cameraPopup.setDOMContent(popupContent);
    cameraPopup.setLngLat(coords).addTo(map.value);
  });

  el.addEventListener("mouseleave", () => {
    cameraPopup.remove();
  });

  cameraMarkerList.value.push(marker);
}

function showCameraMarkers() {
  if (!map.value) return;
  cameraMarkerList.value.forEach((marker) => {
    marker.addTo(map.value!);
  });
}

function clearCameraMarkers() {
  cameraMarkerList.value.forEach((marker) => {
    marker.getElement().remove();
  });
  cameraMarkerList.value = [];
}

async function loadCameras() {
  try {
    const response = await MapAPI.getCameras();
    // Handle both array response and object with cameras property
    const cameras: CameraData[] = Array.isArray(response.data)
      ? response.data
      : response.data.cameras || response.data.results || [];
    clearCameraMarkers();
    cameras.forEach((camera) => {
      createCameraMarker(camera);
    });
    showCameraMarkers();
  } catch (error) {
    console.error("Error loading cameras:", error);
  }
}

onMounted(() => {
  initializeMap();
  updateMap();
  loadCameras();
  Cron("59 0/15 * * * *", () => {
    updateMap();
  });
});
</script>
<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
    <UpdateStatusComponent
      :top="5"
      :date="currentDate"
      :content="[`Mapa actualizado a las ${getTime(currentDate)}`]"
    />
    <SpeedInfoComponent :colorData="COLOR_DATA" :top="30" />
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  flex: 1;
  height: 100vh;
}

.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

body {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
}
</style>
