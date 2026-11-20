<script setup lang="ts">
import MapAPI from "@/components/api/MapAPI";
import DashboardAPI from "@/components/api/DashboardAPI";
import AlertPopup from "@/components/map/AlertPopup.vue";
import CameraPopup from "@/components/map/CameraPopup.vue";
import SegmentPopup from "@/components/map/SegmentPopup.vue";
import ScaleLegend from "@/components/common/ScaleLegend.vue";
import AxisName from "@/components/common/AxisName.vue";
import { PLAUSIBLE_KMH, shortShapeName, useDashboardData } from "@/composables/useDashboardData";
import { TEMPORAL_MS, temporalSegmentFromTimestamp, temporalSegmentFromUTCIndex } from "@/utils/date_utils";
import { binIndex, bins, mapboxStep, type ScaleMode, type Theme } from "@/utils/speedScale";
import { busVolume, serviceEntries } from "@/utils/volume";
import { intervalLabel, scheduleRefresh, useLiveStore } from "@/stores/live";
import { useThemeStore } from "@/stores/theme";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  computed,
  h,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  render,
  shallowRef,
  watch,
} from "vue";
import { useRoute } from "vue-router";

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

const SOURCE_ID = "geojson-source";
const LINE_LAYER = "geojson-layer";
const CASING_LAYER = "geojson-casing";
const SELECTED_SOURCE = "selected-geojson-source";
const SELECTED_LAYER = "selected-geojson-layer";
const HOVER_LAYER = "geojson-hover";
const ARROW_LAYER = "geojson-direction";
const ARROW_IMAGE = "uoct-direction";
/** Width of the incident rail; the map camera is padded by it while it is open. */
const RAIL_W = 376;

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const BASE_STYLE: Record<Theme, string> = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
};
const GROUND: Record<Theme, string> = { dark: "#1b2632", light: "#eee9df" };

/** The basemap is re-inked in the UOCT palette so the landing screen sits in the world. */
const BASEMAP_INK: Record<
  Theme,
  {
    land: string;
    landuse: string;
    water: string;
    building: string;
    road: string;
    roadMajor: string;
    boundary: string;
    label: string;
    halo: string;
  }
> = {
  dark: {
    land: "#1b2632",
    landuse: "#1f2b38",
    water: "#131c26",
    building: "#243243",
    road: "#2c3b4d",
    roadMajor: "#3a4c61",
    boundary: "#3d5168",
    label: "#8f98a3",
    halo: "#1b2632",
  },
  light: {
    land: "#eee9df",
    landuse: "#e6e0d3",
    water: "#cfd6dc",
    building: "#e0d9cb",
    road: "#f8f5ef",
    roadMajor: "#ffffff",
    boundary: "#c9c1b1",
    label: "#5b6470",
    halo: "#eee9df",
  },
};

function reinkBasemap(theme: Theme) {
  const m = map.value;
  if (!m || !TOKEN) return;
  const ink = BASEMAP_INK[theme];
  const set = (id: string, prop: string, value: unknown) => {
    try {
      m.setPaintProperty(id, prop, value);
    } catch {
      // Some stock layers do not accept every property; skip them.
    }
  };
  const ours = new Set([LINE_LAYER, CASING_LAYER, SELECTED_LAYER, HOVER_LAYER, ARROW_LAYER]);
  for (const layer of m.getStyle()?.layers ?? []) {
    const id: string = layer.id;
    if (ours.has(id)) continue;
    if (layer.type === "background") set(id, "background-color", ink.land);
    else if (layer.type === "fill") {
      if (/water/.test(id)) set(id, "fill-color", ink.water);
      else if (/building/.test(id)) set(id, "fill-color", ink.building);
      else set(id, "fill-color", ink.landuse);
    } else if (layer.type === "line") {
      if (/water/.test(id)) set(id, "line-color", ink.water);
      else if (/admin|boundary/.test(id)) set(id, "line-color", ink.boundary);
      else if (/motorway|trunk|primary|major/.test(id)) set(id, "line-color", ink.roadMajor);
      else if (/road|street|bridge|tunnel|path|rail|link|secondary|tertiary/.test(id)) set(id, "line-color", ink.road);
    } else if (layer.type === "symbol") {
      set(id, "text-color", ink.label);
      set(id, "text-halo-color", ink.halo);
    }
  }
}
const CASING: Record<Theme, string> = { dark: "#101820", light: "#fbf9f5" };
const SELECTED: Record<Theme, string> = { dark: "#eee9df", light: "#1b2632" };

const themeStore = useThemeStore();
const live = useLiveStore();
const route = useRoute();

const mapContainer = ref<HTMLElement>();
// Use shallowRef for Mapbox objects to prevent Vue from deep-proxying their
// internal mutable state, which causes overhead and potential corruption.
const map = shallowRef<mapboxgl.Map | null>(null);
const popup = shallowRef<mapboxgl.Popup | null>(null);
const markerList = shallowRef<mapboxgl.Marker[]>([]);
const cameraMarkerList = shallowRef<mapboxgl.Marker[]>([]);

const mode = ref<ScaleMode>("kmh");
const loading = ref(false);
const loadError = ref(false);
const lastGeojson = shallowRef<any | null>(null);
const cameraCount = ref(0);
/** Label of the interval shown instead of the live one while it is still empty. */
const fallbackLabel = ref<string | null>(null);
const pendingLabel = ref<string | null>(null);
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;

// Cron job reference — stored so we can stop it in onUnmounted.
let stopRefresh: (() => void) | null = null;
let listenersBound = false;
let pendingFocus: { shape: string; seq: string } | null = null;

let active = true;

const shapeNames = useDashboardData().shapeNames;
const loadShapeNames = useDashboardData().loadShapeNames;
const fullName = (shape: string | number) => shapeNames.value.get(Number(shape)) || `Shape ${shape}`;

/** One reading per segment, in the shape the rail, the legend and the hover readout share. */
interface SegmentRow {
  key: string;
  shape: string;
  sequence: string;
  speed: number | null;
  historic: number | null;
  ratio: number | null;
  volume: number;
  feature: any;
}
interface AlertRow {
  id: string;
  alert: AlertData;
  shape: string;
  sequence: string;
  speed: number | null;
  segment: SegmentRow | null;
}

const finite = (v: unknown) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
const segKey = (p: any) => `${p?.shape_id}|${p?.sequence}`;

const segmentRows = computed(() => {
  const rows = new Map<string, SegmentRow>();
  for (const f of lastGeojson.value?.features ?? []) {
    const p = f.properties ?? {};
    const speed = finite(p.speed);
    const historic = finite(p.historic_speed);
    rows.set(segKey(p), {
      key: segKey(p),
      shape: String(p.shape_id),
      sequence: String(p.sequence),
      speed,
      historic,
      ratio: speed !== null && historic !== null && historic > 0 ? speed / historic : null,
      volume: speed === null ? 0 : busVolume(p.active_services),
      feature: f,
    });
  }
  return rows;
});

const alertData = shallowRef<AlertData[]>([]);
const alertRows = computed<AlertRow[]>(() =>
  alertData.value
    .map((alert) => {
      // key_value: shape|sequence|day_type|temporal_segment|speed
      const parts = String(alert.key_value ?? "").split("|");
      const segment = segmentRows.value.get(`${parts[0]}|${parts[1]}`) ?? null;
      return { id: alert.key_value, alert, shape: parts[0], sequence: parts[1], speed: finite(parts[4]), segment };
    })
    // Furthest below its own historic first; alerts without a comparison go last, slowest first.
    .sort((a, b) => (a.segment?.ratio ?? 9) - (b.segment?.ratio ?? 9) || (a.speed ?? Infinity) - (b.speed ?? Infinity))
);
const alertKeys = computed(() => new Set(alertRows.value.map((a) => `${a.shape}|${a.sequence}`)));

const slowRows = computed(() =>
  [...segmentRows.value.values()]
    .filter((r) => r.ratio !== null && r.ratio < 1 && (r.speed as number) >= PLAUSIBLE_KMH)
    .sort((a, b) => (a.ratio as number) - (b.ratio as number))
    .slice(0, 20)
);

const counts = computed(() => {
  let withData = 0;
  let compared = 0;
  let below = 0;
  segmentRows.value.forEach((r) => {
    if (r.speed !== null) withData++;
    if (r.ratio !== null) {
      compared++;
      if (r.ratio < 1) below++;
    }
  });
  return { total: segmentRows.value.size, withData, compared, below, alerts: alertRows.value.length };
});

/** Segments per scale bin, so the legend doubles as the distribution of the network. */
const binCounts = computed(() => {
  const list = new Array(bins(mode.value).length).fill(0);
  let noData = 0;
  segmentRows.value.forEach((r) => {
    const i = binIndex(mode.value === "kmh" ? r.speed : r.ratio, mode.value);
    if (i < 0) noData++;
    else list[i]++;
  });
  return { list, noData };
});

// ---------- View state ----------
const railOpen = ref(typeof window === "undefined" || window.innerWidth >= 960);
const railTab = ref<"alerts" | "slow">("alerts");
const railTabTouched = false;
const activeBin = ref<number | null>(null);
const showAlerts = ref(true);
const showCameras = ref(true);
const selectedKey = ref<string | null>(null);
const hoverKey = ref<string | null>(null);
const tipEl = ref<HTMLElement>();
const hovered = computed(() => (hoverKey.value ? segmentRows.value.get(hoverKey.value) ?? null : null));

const SPAN = 1.5;
const barPct = (ratio: number | null) => (ratio === null ? 0 : Math.min(1, ratio / SPAN) * 100);
const pctText = (ratio: number | null) => (ratio === null ? "—" : `${Math.round(ratio * 100)}%`);
const pad2 = (v: string | number) => String(v).padStart(2, "0");
const busesText = (n: number) => `${n} ${n === 1 ? "bus" : "buses"}`;

/** Interval the painted speeds belong to. */
const shownLabel = computed(() => {
  if (fallbackLabel.value) return fallbackLabel.value;
  for (const f of lastGeojson.value?.features ?? []) {
    const idx = finite(f.properties?.temporal_segment);
    if (idx !== null && finite(f.properties?.speed) !== null) return formatTemporalSegmentToSantiago(idx);
  }
  return null;
});

function styleFor(theme: Theme): string | object {
  if (TOKEN) return BASE_STYLE[theme];
  // Without a Mapbox token keep a plain ground so the segments still render.
  return {
    version: 8,
    sources: {},
    layers: [{ id: "ground", type: "background", paint: { "background-color": GROUND[theme] } }],
  };
}

// to-number turns null into 0, which would paint a missing reading as the
// slowest bin; absence has to stay absence.
function numberOr(prop: string): unknown[] {
  const value = ["get", prop];
  return ["case", ["any", ["==", value, null], ["==", value, ""]], -1, ["to-number", value, -1]];
}

function colorInput(m: ScaleMode): unknown[] {
  const speed = numberOr("speed");
  if (m === "kmh") return speed;
  const hist = numberOr("historic_speed");
  return ["case", ["all", [">=", speed, 0], [">", hist, 0]], ["/", speed, hist], -1];
}

function lineColor() {
  return mapboxStep(colorInput(mode.value), mode.value, themeStore.theme);
}

/** True for the feature when it falls in the bin isolated from the legend. */
function inActiveBin(): unknown[] | null {
  const idx = activeBin.value;
  if (idx === null) return null;
  const v = colorInput(mode.value);
  if (idx < 0) return ["<", v, 0];
  const b = bins(mode.value)[idx];
  const lower = [">=", v, b.min];
  return Number.isFinite(b.max) ? ["all", lower, ["<", v, b.max]] : lower;
}

// Segments without data stay visible but step back; isolating a bin from the
// legend pushes everything else down to a trace.
function lineOpacity(scale = 1) {
  const match = inActiveBin();
  if (match) return ["case", match, scale, 0.1 * scale];
  return ["case", ["<", colorInput(mode.value), 0], 0.5 * scale, scale];
}

/** The two slowest bins of the active scale: these are what the operator is looking for. */
function isSlow(): unknown[] {
  const v = colorInput(mode.value);
  return ["all", [">=", v, 0], ["<", v, bins(mode.value)[2].min]];
}

// Wider lines so each segment's color reads at a glance, and wider still when slow.
function zoomWidth(base: [number, number, number], boost = 1.5) {
  const slow = isSlow();
  const stop = (w: number) => ["case", slow, Math.round(w * boost * 10) / 10, w];
  return ["interpolate", ["linear"], ["zoom"], 11, stop(base[0]), 14, stop(base[1]), 17, stop(base[2])];
}
const lineWidth = () => zoomWidth([3, 6, 12]);
const casingWidth = () => zoomWidth([5, 9, 16], 1.4);
const hoverWidth = () => zoomWidth([7, 11, 18], 1.35);
// Slow segments are drawn last, so they stay on top where axes cross.
function sortKey() {
  const v = colorInput(mode.value);
  return ["case", ["<", v, 0], -1, ["-", 1000, v]];
}
const selectedWidth = ["interpolate", ["linear"], ["zoom"], 11, 11, 14, 17, 17, 26];
// Both directions of an axis share the street. line-offset shifts each line to
// the right of its own travel direction, so the two sentidos sit side by side
// instead of on top of each other (about half a casing apart).
const lineOffset = ["interpolate", ["linear"], ["zoom"], 11, 2, 14, 4, 17, 8];

function initializeMap() {
  if (TOKEN) mapboxgl.accessToken = TOKEN;
  map.value = new mapboxgl.Map({
    container: mapContainer.value!,
    style: styleFor(themeStore.theme),
    center: [-70.65387, -33.443018],
    zoom: 14,
    attributionControl: true,
  });
  map.value.dragRotate.disable();
  map.value.touchZoomRotate.disableRotation();
  map.value.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

  // (Re)build the data layers every time a style finishes loading,
  // including after a theme switch.
  map.value.on("style.load", () => {
    reinkBasemap(themeStore.theme);
    addDataLayers();
  });
  // Update camera marker sizes when zoom changes
  map.value.on("zoom", () => updateCameraMarkerSizes());
  if (railOpen.value) map.value.setPadding({ left: RAIL_W, top: 0, right: 0, bottom: 0 });
}

/** Chevron drawn along each segment so the two sentidos of an axis can be told apart. */
function addDirectionImage(theme: Theme) {
  const m = map.value;
  if (!m || m.hasImage(ARROW_IMAGE)) return;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = CASING[theme];
  ctx.lineWidth = 5;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  ctx.moveTo(11, 7);
  ctx.lineTo(21, 16);
  ctx.lineTo(11, 25);
  ctx.stroke();
  const { data } = ctx.getImageData(0, 0, size, size);
  m.addImage(ARROW_IMAGE, { width: size, height: size, data }, { pixelRatio: 2 });
}

function hoverFilter(): unknown[] {
  const [shape, seq] = (hoverKey.value ?? "|").split("|");
  return ["all", ["==", ["to-string", ["get", "shape_id"]], shape], ["==", ["to-string", ["get", "sequence"]], seq]];
}

function addDataLayers() {
  const m = map.value;
  if (!m || !lastGeojson.value) return;
  const theme = themeStore.theme;
  if (!m.getSource(SOURCE_ID)) {
    m.addSource(SOURCE_ID, { type: "geojson", data: lastGeojson.value });
  }
  if (!m.getSource(SELECTED_SOURCE)) {
    m.addSource(SELECTED_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!m.getLayer(SELECTED_LAYER)) {
    m.addLayer({
      id: SELECTED_LAYER,
      type: "line",
      source: SELECTED_SOURCE,
      paint: { "line-color": SELECTED[theme], "line-width": selectedWidth, "line-offset": lineOffset },
      layout: { "line-join": "round", "line-cap": "round" },
    });
  }
  if (!m.getLayer(CASING_LAYER)) {
    m.addLayer({
      id: CASING_LAYER,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": CASING[theme],
        "line-width": casingWidth(),
        "line-opacity": lineOpacity(0.85),
        "line-offset": lineOffset,
      },
      layout: { "line-join": "round", "line-cap": "round" },
    });
  }
  if (!m.getLayer(HOVER_LAYER)) {
    // An ink outline under the hovered segment; the colored line stays readable on top.
    m.addLayer({
      id: HOVER_LAYER,
      type: "line",
      source: SOURCE_ID,
      filter: hoverFilter(),
      paint: { "line-color": SELECTED[theme], "line-width": hoverWidth(), "line-offset": lineOffset },
      layout: { "line-join": "round", "line-cap": "round" },
    });
  }
  if (!m.getLayer(LINE_LAYER)) {
    m.addLayer({
      id: LINE_LAYER,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": lineColor(),
        "line-width": lineWidth(),
        "line-opacity": lineOpacity(),
        "line-offset": lineOffset,
      },
      layout: { "line-join": "round", "line-cap": "round", "line-sort-key": sortKey() },
    });
  }
  if (!m.getLayer(ARROW_LAYER)) {
    addDirectionImage(theme);
    m.addLayer({
      id: ARROW_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      minzoom: 13,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 13, 70, 17, 140],
        "icon-image": ARROW_IMAGE,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.5, 17, 1.1],
        // icon-offset scales with icon-size; these keep the chevron on the offset line.
        "icon-offset": ["interpolate", ["linear"], ["zoom"], 13, ["literal", [0, 6.7]], 17, ["literal", [0, 7.3]]],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: { "icon-opacity": lineOpacity(0.9) },
    });
  }
  if (!listenersBound) {
    // Layer ids are stable, so listeners survive style reloads.
    m.on("click", LINE_LAYER, onFeatureClick);
    m.on("mousemove", LINE_LAYER, onMouseMoveFeature);
    m.on("mouseleave", LINE_LAYER, onMouseLeaveFeature);
    listenersBound = true;
  }
  applyPendingFocus();
}

function formatTemporalSegmentToSantiago(utcIdx: number) {
  if (!utcIdx && utcIdx !== 0) return "";
  const localIdx = temporalSegmentFromUTCIndex(utcIdx, new Date());
  return intervalLabel(localIdx);
}

function getAlertPopupContent(keyValue: string, useful: number, useless: number, volume: number | null) {
  const shape = String(keyValue ?? "").split("|")[0];
  const name = shapeNames.value.has(Number(shape)) ? shortShapeName(fullName(shape)) : "";
  return h(AlertPopup, { keyValue, useful, useless, volume, name });
}

/** Volume of the segment an alert points at (key_value: shape|sequence|...). */
function alertVolume(keyValue: string): number | null {
  const [shape, seq] = String(keyValue ?? "").split("|");
  const feature = (lastGeojson.value?.features ?? []).find(
    (f: any) => String(f.properties?.shape_id) === shape && String(f.properties?.sequence) === seq
  );
  if (!feature || finite(feature.properties?.speed) === null) return null;
  return busVolume(feature.properties?.active_services);
}

function getCameraPopupContent(cameraId: string) {
  return h(CameraPopup, { cameraId });
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getPopupContent(feature: any) {
  const p = feature.properties ?? {};
  // Parse cut_intersection if it exists (comes as JSON string from GeoJSON)
  let cutIntersection = null;
  if (p.cut_intersection) {
    try {
      cutIntersection = typeof p.cut_intersection === "string" ? JSON.parse(p.cut_intersection) : p.cut_intersection;
    } catch (e) {
      console.warn("Failed to parse cut_intersection:", e);
    }
  }
  return h(SegmentPopup, {
    sequence: Number(p.sequence),
    shapeId: String(p.shape_id ?? ""),
    speed: finite(p.speed) ?? NaN,
    historicSpeed: finite(p.historic_speed) ?? NaN,
    temporalRange: formatTemporalSegmentToSantiago(p.temporal_segment),
    cutIntersection,
    services: parseList(p.active_services),
    name: shapeNames.value.get(Number(p.shape_id)),
  });
}

/**
 * Mount a Vue VNode into a container and return a cleanup function that
 * properly unmounts the component tree when the popup closes.
 */
function renderWithCleanup(vnode: ReturnType<typeof h>, container: HTMLElement) {
  render(vnode, container);
  return () => render(null, container);
}

function openSegmentPopup(feature: any, lngLat: mapboxgl.LngLatLike) {
  if (!map.value) return;
  if (!popup.value) {
    popup.value = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      className: "uoct-popup",
      maxWidth: "none",
      offset: 12,
    });
  }
  const popupContent = document.createElement("div");
  const cleanup = renderWithCleanup(getPopupContent(feature), popupContent);
  // Unmount the Vue component tree when the popup is closed to avoid leaks.
  const key = segKey(feature.properties);
  popup.value.once("close", () => {
    cleanup();
    // Re-opening on another segment closes this one first; only then clear.
    if (selectedKey.value !== key) return;
    selectedKey.value = null;
    const source = map.value?.getSource(SELECTED_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: [] });
  });
  popup.value.setDOMContent(popupContent);
  popup.value.setLngLat(lngLat).addTo(map.value);
  selectedKey.value = key;

  const source = map.value.getSource(SELECTED_SOURCE) as mapboxgl.GeoJSONSource | undefined;
  source?.setData({ type: "FeatureCollection", features: [feature] });
}

function onFeatureClick(e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) {
  const feature = e.features?.[0];
  if (!feature) return;
  openSegmentPopup(feature, e.lngLat);
}

function setHover(key: string | null) {
  if (hoverKey.value === key) return;
  hoverKey.value = key;
  if (map.value?.getLayer(HOVER_LAYER)) map.value.setFilter(HOVER_LAYER, hoverFilter() as any);
}

function onMouseMoveFeature(e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) {
  if (!map.value) return;
  const feature = e.features?.[0];
  if (!feature) return;
  map.value.getCanvas().style.cursor = "pointer";
  setHover(segKey(feature.properties));
  // Position is written straight to the element: one style write per frame, no re-render.
  const tip = tipEl.value;
  if (tip) {
    const flip = e.point.x > map.value.getContainer().clientWidth - 260;
    tip.style.transform = `translate(${Math.round(e.point.x)}px, ${Math.round(e.point.y)}px) translate(${
      flip ? "calc(-100% - 14px)" : "14px"
    }, 14px)`;
  }
}

function onMouseLeaveFeature() {
  if (!map.value) return;
  map.value.getCanvas().style.cursor = "";
  setHover(null);
}

/** Bring a segment into view and open its reading (rail rows, links from the Panel). */
function focusFeature(feature: any) {
  const m = map.value;
  const coords: number[][] = feature?.geometry?.coordinates ?? [];
  if (!m || !coords.length) return;
  const bounds = new mapboxgl.LngLatBounds(coords[0] as [number, number], coords[0] as [number, number]);
  coords.forEach((c) => bounds.extend(c as [number, number]));
  const mid = coords[Math.floor(coords.length / 2)] as [number, number];
  popup.value?.remove();
  // Leave the upper half free: the reading opens above the segment.
  const height = m.getContainer().clientHeight;
  const top = Math.min(440, Math.round(height * 0.55));
  m.fitBounds(bounds, {
    padding: { top, bottom: Math.min(120, Math.round(height * 0.15)), left: 120, right: 120 },
    maxZoom: 16,
    duration: 900,
  });
  m.once("moveend", () => openSegmentPopup(feature, mid));
}

function focusAlert(row: AlertRow) {
  if (row.segment) return focusFeature(row.segment.feature);
  const coords = row.alert.coords as [number, number];
  if (coords?.length === 2) map.value?.flyTo({ center: coords, zoom: 15.5, duration: 900 });
}

function toggleRail() {
  railOpen.value = !railOpen.value;
  map.value?.easeTo({
    padding: { left: railOpen.value ? RAIL_W : 0, top: 0, right: 0, bottom: 0 },
    duration: 320,
  });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && popup.value?.isOpen()) popup.value.remove();
}

/** Fly to the segment named in ?shape=&seq= (links from the Panel). */
function applyPendingFocus() {
  const m = map.value;
  // While kept alive in the background the container has no size; wait for activation.
  if (!m || !active || !pendingFocus || !lastGeojson.value) return;
  const target = segmentRows.value.get(`${pendingFocus.shape}|${pendingFocus.seq}`);
  pendingFocus = null;
  if (target) focusFeature(target.feature);
}

const QUARTER = TEMPORAL_MS;

/**
 * Right after each temporal-segment cut the backend serves the new interval before
 * its speeds are processed (about 5 minutes). Paint the previous interval
 * from the speeds export instead of a blank map, and say so.
 */
async function fillFromPreviousInterval(geojson: any) {
  const now = Date.now();
  const cut = Math.floor(now / QUARTER) * QUARTER;
  const start = new Date(cut - 2 * QUARTER);
  const end = new Date(cut - QUARTER - 1000);
  const { data } = await DashboardAPI.getSpeedsCSV(start, end);
  const acc = new Map<string, { d: number; t: number; utc: number; entries: string[] }>();
  const lines = typeof data === "string" ? data.split(/\r?\n/).slice(1) : [];
  for (const line of lines) {
    const row = line.split(",");
    const d = Number(row[4]);
    const t = Number(row[5]);
    if (!(t > 0) || !(d >= 0)) continue;
    const key = `${row[0]}|${row[1]}`;
    const slot = acc.get(key) ?? { d: 0, t: 0, utc: Number(row[2]), entries: [] };
    slot.d += d;
    slot.t += t;
    slot.entries.push(...serviceEntries(row[7]));
    acc.set(key, slot);
  }
  let filled = 0;
  for (const f of geojson.features ?? []) {
    const p = f.properties ?? {};
    const slot = acc.get(`${p.shape_id}|${p.sequence}`);
    if (!slot) continue;
    p.speed = Math.round(((3.6 * slot.d) / slot.t) * 100) / 100;
    p.temporal_segment = slot.utc;
    p.active_services = slot.entries;
    filled++;
  }
  const idx = temporalSegmentFromTimestamp(start);
  pendingLabel.value = intervalLabel(temporalSegmentFromTimestamp(new Date(cut - QUARTER)));
  fallbackLabel.value = filled ? intervalLabel(idx) : null;
}

function scheduleRetry() {
  if (retryTimer || retries >= 5) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retries++;
    updateMap();
  }, 2 * 60 * 1000);
}

async function updateGeoJson() {
  const response = await MapAPI.getMapData();
  const geojsonData = response.data.geojson;
  const hasLive = (geojsonData?.features ?? []).some((f: any) => finite(f.properties?.speed) !== null);
  fallbackLabel.value = null;
  pendingLabel.value = null;
  if (!hasLive && geojsonData?.features?.length) {
    try {
      await fillFromPreviousInterval(geojsonData);
    } catch (e) {
      console.warn("Map: previous-interval fallback failed", e);
    }
    scheduleRetry();
  } else {
    retries = 0;
  }
  alertData.value = response.data.alerts ?? [];
  lastGeojson.value = geojsonData;
  // Open on whichever list has something to say, until the operator picks one.
  if (!railTabTouched) railTab.value = alertData.value.length ? "alerts" : "slow";
  const m = map.value;
  if (!m) return;
  const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(geojsonData);
    applyPendingFocus();
  } else if (m.isStyleLoaded()) {
    addDataLayers();
  }
  clearMarkers();
  alertData.value.forEach((data) => createMarker(data));
  showMarkers();
}

async function updateMap() {
  loading.value = true;
  try {
    await updateGeoJson();
    loadError.value = false;
    live.markUpdated(new Date());
  } catch (e) {
    console.error("Error loading map data:", e);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function hideMarker(marker: mapboxgl.Marker) {
  marker.remove();
}

function showMarker(marker: mapboxgl.Marker) {
  if (!map.value) return;
  marker.addTo(map.value);
}

function createPopup(alertData: AlertData, marker: mapboxgl.Marker) {
  const alertPopup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    className: "uoct-popup",
    maxWidth: "none",
  });
  const popupContent = document.createElement("div");
  const cleanup = renderWithCleanup(
    getAlertPopupContent(alertData.key_value, alertData.useful, alertData.useless, alertVolume(alertData.key_value)),
    popupContent
  );
  alertPopup.setDOMContent(popupContent);
  alertPopup.setLngLat(alertData.coords as [number, number]);
  hideMarker(marker);
  if (map.value) alertPopup.addTo(map.value);
  alertPopup.once("close", () => {
    cleanup();
    showMarker(marker);
  });
}

function createMarker(alertData: AlertData) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "uoct-alert-marker";
  el.setAttribute("aria-label", "Alerta de congestión");
  el.innerHTML = '<span class="chip"><span class="material-icons" aria-hidden="true">warning</span></span>';
  const marker = new mapboxgl.Marker({ element: el }).setLngLat(alertData.coords as [number, number]);
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    createPopup(alertData, marker);
  });
  markerList.value = [...markerList.value, marker];
}

function showMarkers() {
  if (!map.value) return;
  markerList.value.forEach((marker) => marker.addTo(map.value!));
}

function clearMarkers() {
  // Call marker.remove() (not marker.getElement().remove()) to properly
  // unregister the marker from the Mapbox map instance.
  markerList.value.forEach((marker) => marker.remove());
  markerList.value = [];
}

// Calculate camera icon size based on zoom level
function getCameraIconSize(zoom: number) {
  const scale = Math.pow(2, zoom - 14);
  return Math.round(18 * Math.max(0.6, Math.min(1.4, scale)));
}

function createCameraMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "uoct-cam-marker";
  el.style.setProperty("--cam", `${getCameraIconSize(map.value?.getZoom() ?? 14)}px`);
  el.innerHTML = '<span class="material-icons" aria-hidden="true">videocam</span>';
  return el;
}

// Update all camera marker sizes based on current zoom
function updateCameraMarkerSizes() {
  if (!map.value) return;
  const size = `${getCameraIconSize(map.value.getZoom())}px`;
  cameraMarkerList.value.forEach((marker) => marker.getElement().style.setProperty("--cam", size));
}

function createCameraMarker(cameraData: CameraData) {
  const coords: [number, number] = [cameraData.longitude, cameraData.latitude];
  const el = createCameraMarkerElement();
  const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords);
  const cameraPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: "uoct-popup",
    offset: 18,
    maxWidth: "none",
  });

  el.addEventListener("mouseenter", () => {
    if (!map.value) return;
    const popupContent = document.createElement("div");
    const cleanup = renderWithCleanup(getCameraPopupContent(cameraData.camera_id), popupContent);
    cameraPopup.once("close", cleanup);
    cameraPopup.setDOMContent(popupContent);
    cameraPopup.setLngLat(coords).addTo(map.value);
  });
  el.addEventListener("mouseleave", () => cameraPopup.remove());
  cameraMarkerList.value.push(marker);
}

function showCameraMarkers() {
  if (!map.value) return;
  cameraMarkerList.value.forEach((marker) => marker.addTo(map.value!));
}

function clearCameraMarkers() {
  // Call marker.remove() to properly unregister from the Mapbox map instance.
  cameraMarkerList.value.forEach((marker) => marker.remove());
  cameraMarkerList.value = [];
}

async function loadCameras() {
  try {
    const response = await MapAPI.getCameras();
    const cameras: CameraData[] = Array.isArray(response.data)
      ? response.data
      : response.data.cameras || response.data.results || [];
    clearCameraMarkers();
    cameras.forEach((camera) => createCameraMarker(camera));
    cameraCount.value = cameras.length;
    showCameraMarkers();
  } catch (error) {
    console.error("Error loading cameras:", error);
  }
}

function repaint() {
  const m = map.value;
  if (!m?.getLayer(LINE_LAYER)) return;
  m.setPaintProperty(LINE_LAYER, "line-color", lineColor());
  m.setPaintProperty(LINE_LAYER, "line-opacity", lineOpacity());
  m.setPaintProperty(LINE_LAYER, "line-width", lineWidth());
  m.setLayoutProperty(LINE_LAYER, "line-sort-key", sortKey());
  m.setPaintProperty(CASING_LAYER, "line-opacity", lineOpacity(0.85));
  m.setPaintProperty(CASING_LAYER, "line-width", casingWidth());
  m.setPaintProperty(HOVER_LAYER, "line-width", hoverWidth());
  m.setPaintProperty(ARROW_LAYER, "icon-opacity", lineOpacity(0.9));
}

watch(mode, () => {
  // Bins of one scale mean nothing in the other.
  activeBin.value = null;
  repaint();
});
watch(activeBin, repaint);

watch(
  () => themeStore.theme,
  (theme) => {
    // setStyle drops our layers; the style.load handler re-adds them.
    map.value?.setStyle(styleFor(theme), { diff: false });
  }
);

watch(
  () => [route.query.shape, route.query.seq],
  ([shape, seq]) => {
    if (typeof shape === "string" && typeof seq === "string") {
      pendingFocus = { shape, seq };
      applyPendingFocus();
    }
  },
  { immediate: true }
);

onActivated(() => {
  active = true;
  // The container was detached while another section was on screen.
  nextTick(() => {
    map.value?.resize();
    applyPendingFocus();
  });
});
onDeactivated(() => {
  active = false;
  setHover(null);
});

onMounted(() => {
  initializeMap();
  updateMap();
  loadCameras();
  loadShapeNames();
  // Store the cron job reference so it can be stopped when the component unmounts.
  stopRefresh = scheduleRefresh(() => {
    retries = 0;
    updateMap();
  });
});

onUnmounted(() => {
  // Stop the background polling to prevent runaway cron jobs if the component
  // is ever unmounted and remounted (e.g. during route navigation).
  stopRefresh?.();
  stopRefresh = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  clearMarkers();
  clearCameraMarkers();
  // Remove the map instance to free GPU/memory resources.
  map.value?.remove();
  map.value = null;
  listenersBound = false;
});
</script>

<template>
  <div
    class="map-wrapper"
    :class="{ 'rail-open': railOpen, 'hide-alerts': !showAlerts, 'hide-cameras': !showCameras }"
    @keydown="onKeydown"
  >
    <div ref="mapContainer" class="map-container" />

    <aside class="rail" aria-label="Estado de la red" :inert="!railOpen || undefined">
      <header class="rail-head">
        <div>
          <h1 class="caps rail-title">Velocidad por segmento</h1>
          <p class="rail-interval caps num">
            {{
              shownLabel ? `Lecturas de ${shownLabel}` : loading ? "Cargando lecturas" : "Sin lecturas en el intervalo"
            }}
          </p>
        </div>
        <button
          type="button"
          class="btn btn--icon rail-btn"
          :disabled="loading"
          aria-label="Actualizar mapa"
          title="Actualizar mapa"
          @click="updateMap"
        >
          <span class="material-icons" :class="{ spin: loading }" aria-hidden="true">
            {{ loading ? "progress_activity" : "refresh" }}
          </span>
        </button>
      </header>

      <dl class="rail-stats num">
        <div>
          <dt class="caps">Con dato</dt>
          <dd>
            {{ counts.withData }}<span> / {{ counts.total }} seg.</span>
          </dd>
        </div>
        <div>
          <dt class="caps">Bajo su histórico</dt>
          <dd v-if="counts.compared">
            {{ counts.below }}<span> / {{ counts.compared }} seg.</span>
          </dd>
          <dd v-else>—</dd>
        </div>
      </dl>

      <p v-if="fallbackLabel" class="rail-notice">
        <span class="material-icons" aria-hidden="true">hourglass_top</span>
        <span>
          El intervalo {{ pendingLabel }} todavía se procesa en el servidor. Se muestra {{ fallbackLabel }} y se
          reintenta cada 2 min.
        </span>
      </p>
      <p v-else-if="pendingLabel && !counts.withData" class="rail-notice">
        <span class="material-icons" aria-hidden="true">hourglass_top</span>
        <span>Las velocidades de {{ pendingLabel }} todavía no llegan del servidor.</span>
      </p>
      <p v-if="loadError" class="rail-error" role="alert">
        No se pudo actualizar el mapa. Se muestra la última lectura disponible.
        <button type="button" class="btn" @click="updateMap">Reintentar</button>
      </p>

      <div class="rail-tabs" role="tablist" aria-label="Qué revisar">
        <button
          id="rail-tab-alerts"
          type="button"
          role="tab"
          class="rail-tab caps"
          :class="{ 'is-on': railTab === 'alerts' }"
          :aria-selected="railTab === 'alerts'"
          aria-controls="rail-list"
          @click="(railTab = 'alerts'), (railTabTouched = true)"
        >
          Alertas
          <span class="rail-count num" :class="{ 'is-severe': counts.alerts > 0 }">{{ counts.alerts }}</span>
        </button>
        <button
          id="rail-tab-slow"
          type="button"
          role="tab"
          class="rail-tab caps"
          :class="{ 'is-on': railTab === 'slow' }"
          :aria-selected="railTab === 'slow'"
          aria-controls="rail-list"
          @click="(railTab = 'slow'), (railTabTouched = true)"
        >
          Más lentos vs. histórico
        </button>
      </div>

      <div id="rail-list" class="rail-list" role="tabpanel" :aria-labelledby="`rail-tab-${railTab}`">
        <div v-if="loading && !lastGeojson" class="rail-skel" aria-hidden="true">
          <div v-for="n in 6" :key="n" class="skeleton" />
        </div>

        <ol v-else-if="railTab === 'alerts' && alertRows.length">
          <li v-for="row in alertRows" :key="row.id">
            <button
              type="button"
              class="row"
              :class="{ 'is-selected': selectedKey === `${row.shape}|${row.sequence}` }"
              @click="focusAlert(row)"
              @mouseenter="setHover(row.segment?.key ?? null)"
              @mouseleave="setHover(null)"
              @focus="setHover(row.segment?.key ?? null)"
              @blur="setHover(null)"
            >
              <span class="row-flag" aria-hidden="true" />
              <AxisName class="row-name" :name="fullName(row.shape)" />
              <span class="row-pct num" :class="{ 'is-low': (row.segment?.ratio ?? 1) < 1 }">
                {{ pctText(row.segment?.ratio ?? null) }}
              </span>
              <span class="row-meta caps num">
                Seg {{ pad2(row.sequence) }}
                <template v-if="row.segment && row.segment.speed !== null">
                  · {{ busesText(row.segment.volume) }}
                </template>
                <span class="row-votes">
                  <span class="material-icons" aria-hidden="true">thumb_up</span>{{ row.alert.useful }}
                  <span class="visually-hidden">útil,</span>
                  <span class="material-icons" aria-hidden="true">thumb_down</span>{{ row.alert.useless }}
                  <span class="visually-hidden">no útil</span>
                </span>
              </span>
              <span class="row-speed num">
                <b>{{ (row.segment?.speed ?? row.speed)?.toFixed(1) ?? "—" }}</b>
                / {{ row.segment?.historic?.toFixed(1) ?? "—" }} km/h
              </span>
              <span class="row-bar" aria-hidden="true">
                <span class="row-bar-fill" :style="{ width: `${barPct(row.segment?.ratio ?? null)}%` }" />
                <span class="row-bar-ref" />
              </span>
            </button>
          </li>
        </ol>

        <ol v-else-if="railTab === 'slow' && slowRows.length">
          <li v-for="row in slowRows" :key="row.key">
            <button
              type="button"
              class="row"
              :class="{ 'is-selected': selectedKey === row.key }"
              @click="focusFeature(row.feature)"
              @mouseenter="setHover(row.key)"
              @mouseleave="setHover(null)"
              @focus="setHover(row.key)"
              @blur="setHover(null)"
            >
              <span class="row-flag" :class="{ 'is-off': !alertKeys.has(row.key) }" aria-hidden="true" />
              <AxisName class="row-name" :name="fullName(row.shape)" />
              <span class="row-pct num is-low">{{ pctText(row.ratio) }}</span>
              <span class="row-meta caps num">
                Seg {{ pad2(row.sequence) }} · {{ busesText(row.volume) }}
                <span v-if="alertKeys.has(row.key)" class="visually-hidden">, con alerta</span>
              </span>
              <span class="row-speed num">
                <b>{{ row.speed?.toFixed(1) }}</b>
                / {{ row.historic?.toFixed(1) }} km/h
              </span>
              <span class="row-bar" aria-hidden="true">
                <span class="row-bar-fill" :style="{ width: `${barPct(row.ratio)}%` }" />
                <span class="row-bar-ref" />
              </span>
            </button>
          </li>
        </ol>

        <p v-else-if="railTab === 'alerts'" class="rail-empty">
          Sin alertas de congestión en este intervalo. Ningún segmento cayó bajo su histórico dividido por el umbral.
        </p>
        <p v-else class="rail-empty">
          Ningún segmento con velocidad e histórico está bajo su histórico en este intervalo.
        </p>
      </div>

      <p class="rail-foot caps num">
        <span class="row-bar rail-foot-bar" aria-hidden="true">
          <span class="row-bar-fill" style="width: 45%" />
          <span class="row-bar-ref" />
        </span>
        Barra: velocidad actual sobre el histórico; la marca es el 100%.
      </p>
    </aside>

    <button
      type="button"
      class="rail-toggle"
      :aria-expanded="railOpen"
      :aria-label="railOpen ? 'Ocultar el panel lateral' : 'Mostrar el panel lateral'"
      :title="railOpen ? 'Ocultar panel' : 'Mostrar panel'"
      @click="toggleRail"
    >
      <span class="material-icons" aria-hidden="true">{{ railOpen ? "chevron_left" : "chevron_right" }}</span>
      <span v-if="!railOpen && counts.alerts" class="rail-toggle-count num">{{ counts.alerts }}</span>
    </button>

    <div class="map-tools" role="group" aria-label="Capas del mapa">
      <button
        type="button"
        class="tool"
        :class="{ 'is-on': showAlerts }"
        :aria-pressed="showAlerts"
        :title="showAlerts ? 'Ocultar alertas' : 'Mostrar alertas'"
        @click="showAlerts = !showAlerts"
      >
        <span class="material-icons" aria-hidden="true">warning</span>
        <span class="caps">Alertas</span>
        <span class="num tool-n">{{ counts.alerts }}</span>
      </button>
      <button
        type="button"
        class="tool"
        :class="{ 'is-on': showCameras }"
        :aria-pressed="showCameras"
        :title="showCameras ? 'Ocultar cámaras CCTV' : 'Mostrar cámaras CCTV'"
        @click="showCameras = !showCameras"
      >
        <span class="material-icons" aria-hidden="true">videocam</span>
        <span class="caps">Cámaras</span>
        <span class="num tool-n">{{ cameraCount }}</span>
      </button>
    </div>

    <section class="map-card map-legend" aria-label="Escala de color y distribución de segmentos">
      <ScaleLegend
        v-model="mode"
        v-model:active="activeBin"
        :counts="binCounts.list"
        :no-data-count="binCounts.noData"
      />
    </section>

    <div ref="tipEl" class="tip num" :class="{ 'is-on': hovered }" aria-hidden="true">
      <template v-if="hovered">
        <span class="tip-name caps">
          {{ shortShapeName(fullName(hovered.shape)) }} · Seg {{ pad2(hovered.sequence) }}
        </span>
        <span class="tip-speed">
          <b>{{ hovered.speed === null ? "Sin dato" : hovered.speed.toFixed(1) }}</b>
          <template v-if="hovered.speed !== null">
            / {{ hovered.historic === null ? "—" : hovered.historic.toFixed(1) }} km/h
          </template>
        </span>
        <span v-if="hovered.ratio !== null" class="tip-pct" :class="{ 'is-low': hovered.ratio < 1 }">
          {{ pctText(hovered.ratio) }} del histórico · {{ busesText(hovered.volume) }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  --rail-w: 376px;
  --rail-shift: 0px;
  position: relative;
  flex: 1;
  height: calc(100vh - var(--bar-h));
  min-height: 420px;
  overflow: hidden;
}
.map-wrapper.rail-open {
  --rail-shift: var(--rail-w);
}
.map-container {
  position: absolute;
  inset: 0;
}

/* ---------- Incident rail: docked sheet, not a floating card ---------- */
.rail {
  position: absolute;
  z-index: 9;
  inset: 0 auto 0 0;
  width: var(--rail-w);
  max-width: calc(100% - 44px);
  display: flex;
  flex-direction: column;
  background: var(--tile);
  border-right: 1px solid var(--rule-strong);
  transform: translateX(-100%);
  visibility: hidden;
  transition: transform 320ms var(--ease-out), visibility 0s linear 320ms;
}
.rail-open .rail {
  transform: none;
  visibility: visible;
  transition: transform 320ms var(--ease-out), visibility 0s;
}
.rail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-3) 0 var(--s-4);
}
.rail-title {
  margin: 0;
}
.rail-interval {
  margin: 2px 0 0;
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.rail-btn {
  width: 32px;
  height: 32px;
  margin-top: -6px;
  border-color: transparent;
  color: var(--ink-2);
}
.rail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  margin: var(--s-4) 0 0;
  padding: 0 var(--s-4) var(--s-4);
}
.rail-stats dt {
  color: var(--ink-3);
  font-size: var(--t-micro);
  white-space: nowrap;
}
.rail-stats dd {
  margin: 2px 0 0;
  font-size: var(--t-num-s);
  line-height: 1.1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.rail-stats dd span {
  font-size: var(--t-micro);
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.rail-notice {
  display: flex;
  gap: var(--s-2);
  margin: 0 var(--s-4) var(--s-4);
  padding: var(--s-2);
  background: var(--now-wash);
  font-size: var(--t-small);
  color: var(--ink);
}
.rail-notice .material-icons {
  font-size: 16px;
  color: var(--now-line);
}
.rail-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-2);
  margin: 0 var(--s-4) var(--s-4);
  font-size: var(--t-small);
  color: var(--severe-ink);
}

.rail-tabs {
  display: flex;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.rail-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  height: 40px;
  padding: 0 var(--s-4);
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out);
}
.rail-tab + .rail-tab {
  border-left: 1px solid var(--rule);
  flex: 1;
}
.rail-tab:hover {
  color: var(--ink);
}
.rail-tab.is-on {
  color: var(--ink);
  background: var(--tile-2);
}
.rail-tab:focus-visible {
  outline-offset: -2px;
}
.rail-count {
  min-width: 20px;
  padding: 1px 5px;
  background: var(--nodata);
  color: var(--ink-2);
  text-align: center;
}
.rail-count.is-severe {
  background: var(--severe);
  color: var(--on-severe);
}

.rail-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.rail-list ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  width: 100%;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto auto;
  grid-template-areas:
    "flag name name pct"
    ". meta speed speed"
    ". bar bar bar";
  align-items: baseline;
  gap: 3px var(--s-2);
  padding: 10px var(--s-4) 11px;
  border: 0;
  border-bottom: 1px solid var(--rule);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur) var(--ease-out);
}
.row:hover,
.row:focus-visible {
  background: var(--tile-2);
}
.row:focus-visible {
  outline-offset: -2px;
}
.row.is-selected {
  background: var(--tile-3);
}
.row-flag {
  grid-area: flag;
  align-self: center;
  width: 8px;
  height: 8px;
  background: var(--severe);
}
.row-flag.is-off {
  background: transparent;
  box-shadow: 0 0 0 1px var(--rule-strong) inset;
}
.row-name {
  grid-area: name;
  font-size: var(--t-small);
}
.row-pct {
  grid-area: pct;
  text-align: right;
  font-size: var(--t-small);
  color: var(--ink-2);
}
.row-pct.is-low {
  color: var(--severe-ink);
}
.row-meta {
  grid-area: meta;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
  overflow: hidden;
  color: var(--ink-3);
  font-size: var(--t-micro);
  white-space: nowrap;
}
.row-votes {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.row-votes .material-icons {
  font-size: 12px;
}
.row-votes .material-icons + .material-icons,
.row-votes .visually-hidden + .material-icons {
  margin-left: 5px;
}
.row-speed {
  grid-area: speed;
  font-size: var(--t-micro);
  color: var(--ink-3);
  white-space: nowrap;
}
.row-speed b {
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--ink);
}
.row-bar {
  grid-area: bar;
  position: relative;
  display: block;
  height: 3px;
  margin-top: 5px;
  background: var(--nodata);
}
.row-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--severe);
}
.row-bar-ref {
  position: absolute;
  left: 66.66%;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--ink-2);
}
.rail-skel {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.rail-skel .skeleton {
  height: 62px;
}
.rail-empty {
  margin: 0;
  padding: var(--s-4);
  max-width: 40ch;
  color: var(--ink-2);
  font-size: var(--t-small);
}
.rail-foot {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  margin: 0;
  padding: var(--s-3) var(--s-4);
  border-top: 1px solid var(--rule);
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.rail-foot-bar {
  flex: 0 0 36px;
  margin: 0;
}

/* Handle on the rail's edge; it travels with the rail. */
.rail-toggle {
  position: absolute;
  z-index: 9;
  top: var(--s-4);
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 28px;
  height: 44px;
  padding: 0 4px;
  border: 1px solid var(--rule-strong);
  border-left: 0;
  background: var(--tile);
  color: var(--ink-2);
  cursor: pointer;
  transform: translateX(var(--rail-shift));
  transition: transform 320ms var(--ease-out), color var(--dur) var(--ease-out),
    background-color var(--dur) var(--ease-out);
}
.rail-toggle:hover {
  color: var(--ink);
  background: var(--tile-2);
}
.rail-toggle-count {
  padding: 1px 5px;
  margin-right: 2px;
  background: var(--severe);
  color: var(--on-severe);
  font-size: var(--t-micro);
}

/* ---------- Floating controls ---------- */
.map-card {
  position: absolute;
  z-index: 5;
  background: var(--tile);
  box-shadow: var(--shadow-float);
  border: 1px solid var(--rule);
}
.map-legend {
  left: var(--s-4);
  bottom: var(--s-6);
  max-width: calc(100% - var(--rail-shift) - 2 * var(--s-4) - 60px);
  padding: var(--s-3) var(--s-4);
  transform: translateX(var(--rail-shift));
  transition: transform 320ms var(--ease-out);
}
.map-tools {
  position: absolute;
  z-index: 5;
  top: var(--s-4);
  right: var(--s-4);
  display: flex;
  background: var(--tile);
  border: 1px solid var(--rule-strong);
  box-shadow: var(--shadow-float);
}
.tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 var(--s-3);
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  transition: color var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out);
}
.tool + .tool {
  border-left: 1px solid var(--rule);
}
.tool:hover {
  background: var(--tile-2);
  color: var(--ink);
}
.tool .material-icons {
  font-size: 16px;
}
.tool .caps,
.tool-n {
  font-size: var(--t-micro);
}
.tool.is-on {
  color: var(--ink);
}
/* Off reads as struck through, so the state does not hang on color alone. */
.tool:not(.is-on) .caps {
  text-decoration: line-through;
}
.tool:not(.is-on) .tool-n {
  visibility: hidden;
}

/* Reading that follows the cursor over a segment. */
.tip {
  position: absolute;
  z-index: 10;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 168px;
  padding: var(--s-2) var(--s-3);
  background: var(--ink);
  color: var(--ground);
  box-shadow: var(--shadow-float);
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms var(--ease-out);
  will-change: transform;
}
.tip.is-on {
  opacity: 1;
}
.tip-name {
  font-size: var(--t-micro);
  opacity: 0.8;
  white-space: nowrap;
}
.tip-speed {
  font-size: var(--t-micro);
  white-space: nowrap;
}
.tip-speed b {
  font-size: var(--t-title);
  font-weight: 600;
}
.tip-pct {
  font-size: var(--t-micro);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .map-wrapper {
    --rail-w: min(376px, calc(100vw - 44px));
  }
  .map-legend {
    left: var(--s-2);
    bottom: var(--s-2);
    max-width: calc(100% - var(--s-2) * 2 - 48px);
    transform: none;
  }
  .map-tools {
    top: auto;
    right: var(--s-2);
    bottom: 132px;
    flex-direction: column;
  }
  .tool + .tool {
    border-left: 0;
    border-top: 1px solid var(--rule);
  }
  .tool .caps {
    display: none;
  }
}
</style>

<style>
/* Markers are created outside the component tree, so these stay global. */
/*
 * Mapbox positions markers with an inline transform on the root element, so the
 * root must never transition transform (it made markers trail the map while
 * panning). Hover feedback lives on the inner chip instead.
 */
.uoct-alert-marker {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.uoct-alert-marker .chip {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: 2px solid var(--on-severe);
  background: var(--severe);
  color: var(--on-severe);
  box-shadow: 0 4px 10px -2px rgba(8, 12, 18, 0.5);
  transition: scale var(--dur) var(--ease-out);
}
.uoct-alert-marker:hover .chip,
.uoct-alert-marker:focus-visible .chip {
  scale: 1.12;
}
.uoct-alert-marker .material-icons {
  font-size: 16px;
  font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 20;
}
.uoct-cam-marker {
  display: grid;
  place-items: center;
  width: calc(var(--cam, 18px) + 6px);
  height: calc(var(--cam, 18px) + 6px);
  background: var(--tile);
  color: var(--ink-2);
  border: 1px solid var(--rule-strong);
  cursor: pointer;
}
.uoct-cam-marker .material-icons {
  font-size: var(--cam, 18px);
}
/* Readings open over the legend and the layer switches, under the rail. */
.uoct-popup {
  z-index: 8;
}
.hide-alerts .uoct-alert-marker,
.hide-cameras .uoct-cam-marker {
  display: none;
}
.uoct-cam-marker:hover {
  color: var(--ink);
  border-color: var(--ink-2);
}
</style>
