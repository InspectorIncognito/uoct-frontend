<script setup lang="ts">
import { computed } from "vue";
import { busVolume } from "@/utils/volume";
import AxisName from "@/components/common/AxisName.vue";

interface CutIntersection {
  osm_node_id: number;
  latitude: number;
  longitude: number;
  intersection_type: string;
  name: string | null;
  streets: string[];
  highway_types: string[];
}

const props = defineProps<{
  sequence?: number;
  shapeId?: string;
  speed?: number;
  historicSpeed?: number;
  temporalRange?: string;
  cutIntersection?: CutIntersection | null;
  services?: string[];
  /** Axis name ("Alameda · sentido 1") when the shape names are loaded. */
  name?: string;
}>();

// Mapeo de tipos de vía a nombres legibles
const highwayTypeLabels: Record<string, string> = {
  motorway: "Autopista",
  motorway_link: "Enlace autopista",
  trunk: "Vía troncal",
  trunk_link: "Enlace troncal",
  primary: "Primaria",
  primary_link: "Enlace primaria",
  secondary: "Secundaria",
  secondary_link: "Enlace secundaria",
  tertiary: "Terciaria",
  tertiary_link: "Enlace terciaria",
  residential: "Residencial",
  unclassified: "Sin clasificar",
  service: "Servicio",
  living_street: "Zona residencial",
  pedestrian: "Peatonal",
  busway: "Vía de buses",
};

function formatHighwayType(type: string): string {
  return highwayTypeLabels[type] || type;
}

// active_services lists every bus that crossed the segment ("service|plate");
// the popup only reports how many distinct buses the speed comes from.
const volume = computed(() => busVolume(props.services ?? []));

const hasSpeed = computed(() => Number.isFinite(props.speed));
const hasHistoric = computed(() => Number.isFinite(props.historicSpeed) && (props.historicSpeed as number) > 0);
const ratio = computed(() =>
  hasSpeed.value && hasHistoric.value ? (props.speed as number) / (props.historicSpeed as number) : null
);
const speedText = computed(() => (hasSpeed.value ? (props.speed as number).toFixed(1) : "—"));
const historicText = computed(() => (hasHistoric.value ? (props.historicSpeed as number).toFixed(1) : "—"));
// Bar spans 0..150% of the historic; the tick marks 100%.
const barWidth = computed(() => (ratio.value === null ? 0 : Math.min(1, ratio.value / 1.5) * 100));
</script>

<template>
  <div class="seg-popup">
    <header class="sp-head caps num">
      <AxisName v-if="name" class="sp-name" :name="name" />
      <span v-else>Shape {{ shapeId }}</span>
      <span class="sp-seg">Seg {{ String(sequence ?? "").padStart(2, "0") }}</span>
    </header>

    <div class="sp-body">
      <div class="sp-time caps num">
        <span class="material-icons" aria-hidden="true">schedule</span>
        {{ temporalRange || "Sin intervalo" }}
        <span v-if="name" class="sp-shape">Shape {{ shapeId }}</span>
      </div>

      <div class="sp-speed num">
        <span class="sp-value">{{ speedText }}</span>
        <span class="sp-denom caps"> / {{ historicText }} km/h </span>
      </div>
      <div class="sp-legend caps">
        <span>{{ hasSpeed ? "Velocidad actual" : "Sin velocidad registrada" }}</span>
        <span>{{ hasHistoric ? "Histórico" : "Histórico no calculado" }}</span>
      </div>

      <div v-if="ratio !== null" class="sp-ratio">
        <span class="sp-bar" aria-hidden="true">
          <span class="sp-bar-fill" :class="{ 'is-low': ratio < 1 }" :style="{ width: `${barWidth}%` }" />
          <span class="sp-bar-ref" />
        </span>
        <span class="num sp-pct" :class="{ 'is-low': ratio < 1 }">{{ Math.round(ratio * 100) }}% del histórico</span>
      </div>

      <div v-if="hasSpeed" class="sp-row">
        <span class="caps sp-k">Volumen</span>
        <span class="sp-v num">
          <b>{{ volume }}</b> {{ volume === 1 ? "bus" : "buses" }}
          <span v-if="volume === 1" class="sp-buses">· velocidad de un solo bus</span>
        </span>
      </div>

      <div class="sp-cut">
        <template v-if="cutIntersection">
          <div class="sp-cut-title caps">
            <span class="material-icons" aria-hidden="true">traffic</span>
            Corte en semáforo
          </div>
          <div v-if="cutIntersection.streets && cutIntersection.streets.length" class="sp-row">
            <span class="caps sp-k">Calles</span>
            <span class="sp-v">{{ cutIntersection.streets.join(", ") }}</span>
          </div>
          <div v-if="cutIntersection.highway_types && cutIntersection.highway_types.length" class="sp-row">
            <span class="caps sp-k">Tipo de vía</span>
            <span class="sp-v">{{ cutIntersection.highway_types.map(formatHighwayType).join(", ") }}</span>
          </div>
          <div class="sp-row">
            <span class="caps sp-k">Ubicación</span>
            <span class="sp-v num">
              {{ cutIntersection.latitude.toFixed(5) }}, {{ cutIntersection.longitude.toFixed(5) }}
            </span>
          </div>
        </template>
        <div v-else class="sp-cut-title sp-cut-title--plain caps">
          <span class="material-icons" aria-hidden="true">straighten</span>
          Corte por distancia
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seg-popup {
  font-family: var(--font);
  color: var(--ink);
  width: 288px;
}
.sp-head {
  display: flex;
  gap: var(--s-3);
  align-items: center;
  padding: 10px 40px 10px var(--s-4);
  background: var(--ink);
  color: var(--ground);
}
.sp-name {
  min-width: 0;
}
.sp-seg {
  opacity: 0.75;
  flex-shrink: 0;
}
.sp-shape {
  margin-left: auto;
  color: var(--ink-3);
}
.sp-body {
  padding: var(--s-3) var(--s-4) var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.sp-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
}
.sp-time .material-icons {
  font-size: 15px;
}
.sp-speed {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-2);
  margin-top: var(--s-1);
}
.sp-value {
  font-size: var(--t-num-m);
  line-height: 1;
  letter-spacing: -0.03em;
}
.sp-denom {
  color: var(--ink-2);
}
.sp-legend {
  display: flex;
  justify-content: space-between;
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.sp-ratio {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--s-3);
  align-items: center;
  margin-top: var(--s-1);
}
.sp-bar {
  position: relative;
  height: 6px;
  background: var(--nodata);
}
.sp-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--ink-2);
}
.sp-bar-fill.is-low {
  background: var(--severe);
}
.sp-bar-ref {
  position: absolute;
  left: 66.66%;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--ink);
}
.sp-pct {
  font-size: var(--t-small);
  color: var(--ok-ink);
}
.sp-pct.is-low {
  color: var(--severe-ink);
}
.sp-row {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: var(--s-2);
  font-size: var(--t-small);
}
.sp-k {
  color: var(--ink-3);
  font-size: var(--t-micro);
  padding-top: 2px;
}
.sp-v {
  color: var(--ink);
  word-break: break-word;
}
.sp-buses {
  color: var(--ink-3);
}
.sp-v b {
  font-weight: 600;
}
.sp-cut {
  margin-top: var(--s-1);
  padding-top: var(--s-2);
  border-top: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sp-cut-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--now-line);
}
.sp-cut-title--plain {
  color: var(--ink-3);
}
.sp-cut-title .material-icons {
  font-size: 16px;
}
</style>
