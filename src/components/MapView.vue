<script setup lang="ts">
import MapAPI from "@/components/api/MapAPI";
import AlertPopup from "@/components/map/AlertPopup.vue";
import CameraPopup from "@/components/map/CameraPopup.vue";
import SegmentPopup from "@/components/map/SegmentPopup.vue";
import SpeedInfoComponent from "@/components/map/SpeedInfoComponent.vue";
import TrafficSignalPopup from "@/components/map/TrafficSignalPopup.vue";
import UpdateStatusComponent from "@/components/map/UpdateStatusComponent.vue";
import {
  parseTemporalSegment,
  temporalSegmentFromUTCIndex,
} from "@/utils/date_utils";
import { Cron } from "croner";
import { ElNotification } from "element-plus";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { h, onMounted, onUnmounted, ref, render, shallowRef } from "vue";

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

interface TrafficSignalData {
  id: number;
  osm_id: string;
  intersecting_ways: number | string;
  longitude: number;
  latitude: number;
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

const mapContainer = ref<HTMLElement>();

// Use shallowRef for Mapbox objects to prevent Vue from deep-proxying their
// internal mutable state, which causes overhead and potential corruption.
const map = shallowRef<mapboxgl.Map | null>(null);
const popup = shallowRef<mapboxgl.Popup | null>(null);

const currentDate = ref(new Date());

const markerList = shallowRef<mapboxgl.Marker[]>([]);
const cameraMarkerList = shallowRef<mapboxgl.Marker[]>([]);
const trafficSignalMarkerList = shallowRef<mapboxgl.Marker[]>([]);

// Cron job reference — stored so we can stop it in onUnmounted.
let cronJob: ReturnType<typeof Cron> | null = null;

const geoJsonSourceId = "geojson-source";
const geoJsonLayerId = "geojson-layer";
const selectedGeoJsonSourceId = "selected-geojson-source";
const selectedGeoJsonLayerId = "selected-geojson-layer";

// Camera SVG icon (returns SVG with dynamic size)
function getCameraSvgIcon(width: number, height: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 79 51" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M50.0417 21.25V36.8333C50.0417 37.1124 49.9867 37.3887 49.8799 37.6465C49.7731 37.9044 49.6166 38.1386 49.4193 38.3359C49.2219 38.5333 48.9877 38.6898 48.7299 38.7966C48.472 38.9034 48.1957 38.9583 47.9167 38.9583H9.66666C9.3876 38.9583 9.11127 38.9034 8.85345 38.7966C8.59564 38.6898 8.36138 38.5333 8.16405 38.3359C7.96673 38.1386 7.8102 37.9044 7.70341 37.6465C7.59662 37.3887 7.54166 37.1124 7.54166 36.8333V5.66667C7.54166 5.10308 7.76554 4.56258 8.16405 4.16406C8.56257 3.76555 9.10307 3.54167 9.66666 3.54167H47.9167C48.4802 3.54167 49.0207 3.76555 49.4193 4.16406C49.8178 4.56258 50.0417 5.10308 50.0417 5.66667V21.25ZM50.0417 21.25L67.8067 6.44583C68.117 6.18738 68.4945 6.02269 68.895 5.97106C69.2955 5.91944 69.7025 5.98301 70.0682 6.15434C70.4339 6.32567 70.7432 6.59765 70.9599 6.93844C71.1765 7.27923 71.2916 7.6747 71.2917 8.07854V34.4215C71.291 34.825 71.1754 35.22 70.9584 35.5603C70.7415 35.9005 70.4321 36.172 70.0666 36.3429C69.701 36.5138 69.2943 36.577 68.8941 36.5253C68.4939 36.4735 68.1167 36.3089 67.8067 36.0506L50.0417 21.25Z" fill="#3B5B97" stroke="#3B5B97" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Calculate camera icon size based on zoom level
function getCameraIconSize(zoom: number): { width: number; height: number } {
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

// Traffic signal SVG icon (returns SVG with dynamic size)
function getTrafficSignalSvgIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="7" y="2" width="10" height="20" rx="2" fill="#333" stroke="#555" stroke-width="1"/>
<circle cx="12" cy="6" r="2.5" fill="#e74c3c"/>
<circle cx="12" cy="12" r="2.5" fill="#f39c12"/>
<circle cx="12" cy="18" r="2.5" fill="#2ecc71"/>
</svg>`;
}

// Calculate traffic signal icon size based on zoom level
function getTrafficSignalIconSize(zoom: number): number {
  const baseZoom = 14;
  const baseSize = 20;
  const scale = Math.pow(2, zoom - baseZoom);
  // Clamp scale between 0.25 and 2 to avoid too small or too large icons
  const clampedScale = Math.max(0.25, Math.min(2, scale));
  return Math.round(baseSize * clampedScale);
}

function initializeMap() {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map.value = new mapboxgl.Map({
    container: mapContainer.value!,
    style: "mapbox://styles/mapbox/dark-v10",
    center: [-70.65387, -33.443018],
    zoom: 14,
  });
  map.value.dragRotate.disable();

  // Update camera marker sizes when zoom changes
  map.value.on("zoom", () => {
    updateCameraMarkerSizes();
    updateTrafficSignalMarkerSizes();
  });
}

function formatTemporalSegmentToSantiago(utcIdx: number) {
  if (!utcIdx && utcIdx !== 0) return "";
  const referenceDate = new Date();
  const localIdx = temporalSegmentFromUTCIndex(utcIdx, referenceDate);
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

function getTrafficSignalPopupContent(osmId: string, intersectingWays: number) {
  return h(TrafficSignalPopup, {
    osmId: osmId,
    intersectingWays: intersectingWays,
  });
}

function getPopupContent(feature: any) {
  const sequence = Number(feature.properties?.sequence);
  const shapeId = String(feature.properties?.shape_id ?? "");
  const speedValue = Number(feature.properties.speed);
  const historicSpeedValue = Number(feature.properties.historic_speed);
  const temporalRange = formatTemporalSegmentToSantiago(
    feature.properties.temporal_segment
  );

  // Parse cut_intersection if it exists (comes as JSON string from GeoJSON)
  let cutIntersection = null;
  if (feature.properties?.cut_intersection) {
    try {
      cutIntersection =
        typeof feature.properties.cut_intersection === "string"
          ? JSON.parse(feature.properties.cut_intersection)
          : feature.properties.cut_intersection;
    } catch (e) {
      console.warn("Failed to parse cut_intersection:", e);
    }
  }

  return h(SegmentPopup, {
    sequence: sequence,
    shapeId: shapeId,
    speed: speedValue,
    historicSpeed: historicSpeedValue,
    temporalRange: temporalRange,
    cutIntersection: cutIntersection,
  });
}

/**
 * Mount a Vue VNode into a container and return a cleanup function that
 * properly unmounts the component tree when the popup closes.
 */
function renderWithCleanup(
  vnode: ReturnType<typeof h>,
  container: HTMLElement
) {
  render(vnode, container);
  return () => render(null, container);
}

function onFeatureClick(
  e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }
) {
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
  const cleanup = renderWithCleanup(getPopupContent(feature), popupContent);
  // Unmount the Vue component tree when the popup is closed to avoid leaks.
  popup.value.once("close", cleanup);

  popup.value.setDOMContent(popupContent);
  popup.value.setLngLat(e.lngLat).addTo(map.value);

  // Fix accessibility: remove aria-hidden from close button to prevent focus trap warning
  const closeButton = popup.value
    .getElement()
    ?.querySelector(".mapboxgl-popup-close-button");
  if (closeButton) {
    closeButton.removeAttribute("aria-hidden");
  }

  const source = map.value.getSource(selectedGeoJsonSourceId) as
    | mapboxgl.GeoJSONSource
    | undefined;
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
    // Remove existing event listeners BEFORE removing the layer/source
    // to prevent accumulation of duplicate listeners on every refresh.
    map.value.off("click", geoJsonLayerId, onFeatureClick);
    map.value.off("mouseenter", geoJsonLayerId, onMouseEnterFeature);
    map.value.off("mouseleave", geoJsonLayerId, onMouseLeaveFeature);
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

  // Register event listeners exactly once after (re)adding the layer.
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

function hideMarker(marker: mapboxgl.Marker) {
  marker.remove();
}

function showMarker(marker: mapboxgl.Marker) {
  if (!map.value) return;
  marker.addTo(map.value);
}

function createPopup(alertData: AlertData, marker: mapboxgl.Marker) {
  const keyValue = alertData.key_value;
  const coords = alertData.coords;
  const useful = alertData.useful;
  const useless = alertData.useless;

  const alertPopup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    className: "custom-popup",
  });
  const popupContent = document.createElement("div");
  const cleanup = renderWithCleanup(
    getAlertPopupContent(keyValue, useful, useless),
    popupContent
  );
  alertPopup.setDOMContent(popupContent);
  alertPopup.setLngLat(coords);
  hideMarker(marker);
  if (map.value) alertPopup.addTo(map.value);

  // Fix accessibility: remove aria-hidden from close button to prevent focus trap warning
  const closeButton = alertPopup
    .getElement()
    ?.querySelector(".mapboxgl-popup-close-button");
  if (closeButton) {
    closeButton.removeAttribute("aria-hidden");
  }

  alertPopup.once("close", () => {
    cleanup();
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
  // Call marker.remove() (not marker.getElement().remove()) to properly
  // unregister the marker from the Mapbox map instance.
  markerList.value.forEach((marker) => {
    marker.remove();
  });
  markerList.value = [];
}

// Camera marker functions
function createCameraMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  const zoom = map.value?.getZoom() ?? 14;
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

  const cameraPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "camera-popup",
    offset: 25,
  });

  el.addEventListener("mouseenter", () => {
    if (!map.value) return;
    const popupContent = document.createElement("div");
    const cleanup = renderWithCleanup(
      getCameraPopupContent(cameraData.camera_id),
      popupContent
    );
    cameraPopup.once("close", cleanup);
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
  // Call marker.remove() to properly unregister from the Mapbox map instance.
  cameraMarkerList.value.forEach((marker) => {
    marker.remove();
  });
  cameraMarkerList.value = [];
}

async function loadCameras() {
  try {
    const response = await MapAPI.getCameras();
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

// Traffic signal marker functions
function createTrafficSignalMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  const zoom = map.value?.getZoom() ?? 14;
  const size = getTrafficSignalIconSize(zoom);
  el.innerHTML = getTrafficSignalSvgIcon(size);
  el.style.cursor = "pointer";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.classList.add("traffic-signal-marker");
  return el;
}

// Update all traffic signal marker sizes based on current zoom
function updateTrafficSignalMarkerSizes() {
  if (!map.value) return;
  const zoom = map.value.getZoom();
  const size = getTrafficSignalIconSize(zoom);
  trafficSignalMarkerList.value.forEach((marker) => {
    const el = marker.getElement();
    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
    }
  });
}

function createTrafficSignalMarker(signalData: TrafficSignalData) {
  const coords: [number, number] = [signalData.longitude, signalData.latitude];
  const el = createTrafficSignalMarkerElement();

  const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords);

  const signalPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "traffic-signal-popup",
    offset: 25,
  });

  el.addEventListener("mouseenter", () => {
    if (!map.value) return;
    const popupContent = document.createElement("div");
    const cleanup = renderWithCleanup(
      getTrafficSignalPopupContent(
        signalData.osm_id,
        signalData.intersecting_ways
      ),
      popupContent
    );
    signalPopup.once("close", cleanup);
    signalPopup.setDOMContent(popupContent);
    signalPopup.setLngLat(coords).addTo(map.value);
  });

  el.addEventListener("mouseleave", () => {
    signalPopup.remove();
  });

  trafficSignalMarkerList.value.push(marker);
}

function showTrafficSignalMarkers() {
  if (!map.value) return;
  trafficSignalMarkerList.value.forEach((marker) => {
    marker.addTo(map.value!);
  });
}

function clearTrafficSignalMarkers() {
  // Call marker.remove() to properly unregister from the Mapbox map instance.
  trafficSignalMarkerList.value.forEach((marker) => {
    marker.remove();
  });
  trafficSignalMarkerList.value = [];
}

async function loadTrafficSignals() {
  try {
    const response = await MapAPI.getTrafficSignals();
    const geojson = response.data;
    clearTrafficSignalMarkers();

    if (geojson && geojson.features) {
      geojson.features.forEach((feature: any) => {
        const signalData: TrafficSignalData = {
          id: feature.properties.id,
          osm_id: feature.properties.osm_id,
          intersecting_ways: feature.properties.intersecting_ways,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        };
        createTrafficSignalMarker(signalData);
      });
    }
    showTrafficSignalMarkers();
  } catch (error) {
    console.error("Error loading traffic signals:", error);
  }
}

onMounted(() => {
  initializeMap();
  updateMap();
  loadCameras();
  loadTrafficSignals();
  // Store the cron job reference so it can be stopped when the component unmounts.
  cronJob = Cron("59 0/15 * * * *", () => {
    updateMap();
  });
});

onUnmounted(() => {
  // Stop the background polling to prevent runaway cron jobs if the component
  // is ever unmounted and remounted (e.g. during route navigation).
  cronJob?.stop();
  cronJob = null;
  // Remove the map instance to free GPU/memory resources.
  map.value?.remove();
  map.value = null;
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
