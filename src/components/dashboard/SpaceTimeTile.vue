<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import ScaleLegend from "@/components/common/ScaleLegend.vue";
import { useElementSize } from "@/composables/useElementSize";
import { useThemeStore } from "@/stores/theme";
import { intervalLabel } from "@/stores/live";
import { colorFor, type ScaleMode } from "@/utils/speedScale";
import { INTERVALS, type AxisSummary, type MatrixRow } from "@/composables/useDashboardData";

const GUTTER_L = 44;
const GUTTER_R = 8;
// Tall enough to show a whole axis (100+ segments) at once: a Marey reading
// needs the full length of the axis in view. Scroll only past ~220 segments.
const MATRIX_H = 440;
const CURVE_H = 112;
// Volume strip under the curve: distinct buses measured per interval.
const VOL_H = 44;
const VOL_GAP = 6;
const MIN_ROW = 2;
const MAX_ROW = 22;

const props = defineProps<{
  axes: AxisSummary[];
  shape: number | null;
  rows: MatrixRow[];
  curveToday: (number | null)[];
  curveHistoric: (number | null)[];
  curveVolume: (number | null)[];
  nowIndex: number;
  mode: ScaleMode;
  seriesState: "idle" | "loading" | "ready" | "error";
  historicLabel: string;
  /** Pin this sequence at the NOW column (e.g. picked from a ranking). */
  highlight?: { sequence: number; token: number } | null;
}>();

const emit = defineEmits<{
  (e: "update:shape", v: number): void;
  (e: "update:mode", v: ScaleMode): void;
  (e: "open-map", v: { shape: number; sequence: number }): void;
  (e: "retry"): void;
}>();

const themeStore = useThemeStore();
const frame = ref<HTMLElement>();
const scroller = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const { width } = useElementSize(frame);

const plotW = computed(() => Math.max(0, width.value - GUTTER_L - GUTTER_R));
const colW = computed(() => plotW.value / INTERVALS);
const rowH = computed(() => {
  const n = Math.max(1, props.rows.length);
  return Math.max(MIN_ROW, Math.min(MAX_ROW, Math.floor(MATRIX_H / n)));
});
const canvasH = computed(() => props.rows.length * rowH.value);
const matrixH = computed(() => Math.min(MATRIX_H, Math.max(rowH.value * props.rows.length, 120)));

const totalKm = computed(() => {
  const last = props.rows[props.rows.length - 1];
  return last ? last.startKm + last.lengthKm : 0;
});

/** Distance ticks for the y axis: rows where a km step boundary starts. */
const kmTicks = computed(() => {
  const n = props.rows.length;
  if (!n || totalKm.value <= 0) return [] as { r: number; km: number }[];
  const h = n * rowH.value;
  const steps = [0.5, 1, 2, 5, 10];
  const step = steps.find((st) => (totalKm.value / st) * 14 <= h) ?? 10;
  const ticks: { r: number; km: number }[] = [];
  let next = 0;
  let lastY = -Infinity;
  props.rows.forEach((row, r) => {
    if (row.startKm + 1e-6 >= next) {
      const y = r * rowH.value;
      if (y - lastY >= 12) {
        ticks.push({ r, km: Math.round(row.startKm / step) * step });
        lastY = y;
      }
      next = (Math.floor(row.startKm / step) + 1) * step;
    }
  });
  return ticks;
});

const hover = ref<{ r: number | null; i: number } | null>(null);
const pinned = ref<{ r: number; i: number } | null>(null);
const focus = computed(() => hover.value ?? pinned.value);

const currentAxis = computed(() => props.axes.find((a) => a.shape === props.shape));

function cellValue(r: number, i: number) {
  const cell = props.rows[r]?.cells[i];
  if (!cell || cell.speed === null) return null;
  if (props.mode === "kmh") return cell.speed;
  return cell.historic && cell.historic > 0 ? cell.speed / cell.historic : null;
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function draw() {
  const el = canvas.value;
  if (!el || !width.value) return;
  const dpr = window.devicePixelRatio || 1;
  const w = width.value;
  const h = props.rows.length ? props.rows.length * rowH.value : matrixH.value;
  el.width = Math.round(w * dpr);
  el.height = Math.round(h * dpr);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const theme = themeStore.theme;
  const nodata = cssVar("--nodata");
  const hatch = cssVar("--nodata-hatch");
  const paper = cssVar("--ground-grid-major");
  const ink3 = cssVar("--ink-3");
  const cw = colW.value;
  const rh = rowH.value;
  const gap = cw > 5 ? 1 : 0.5;

  props.rows.forEach((row, r) => {
    const y = r * rh;
    for (let i = 0; i < INTERVALS; i++) {
      const x = GUTTER_L + i * cw;
      if (i > props.nowIndex) {
        // The rest of the day is still blank paper.
        ctx.strokeStyle = paper;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
        continue;
      }
      const value = cellValue(r, i);
      if (value === null) {
        ctx.fillStyle = nodata;
        ctx.fillRect(x + gap / 2, y + gap / 2, cw - gap, rh - gap);
        if (rh >= 8) {
          ctx.strokeStyle = hatch;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + gap, y + rh - gap);
          ctx.lineTo(x + cw - gap, y + gap);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = colorFor(value, props.mode, theme);
        ctx.fillRect(x + gap / 2, y + gap / 2, cw - gap, rh - gap);
      }
    }
  });

  // Distance ticks (km from the start of the axis) in the left gutter.
  ctx.fillStyle = ink3;
  ctx.strokeStyle = ink3;
  ctx.font = `400 10px ${cssVar("--font") || "monospace"}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const t of kmTicks.value) {
    const y = t.r * rh;
    ctx.fillRect(GUTTER_L - 6, Math.round(y), 4, 1);
    const ty = Math.min(h - 6, Math.max(6, y));
    const label = Number.isInteger(t.km) ? String(t.km) : t.km.toFixed(1);
    ctx.fillText(label, GUTTER_L - 10, ty);
  }
}

watch(
  () => [props.rows, props.mode, props.nowIndex, width.value, themeStore.theme, kmTicks.value],
  () => nextTick(draw),
  { deep: false }
);
onMounted(() => nextTick(draw));

watch(
  () => props.shape,
  () => {
    pinned.value = null;
    hover.value = null;
  }
);

watch(
  () => [props.highlight, props.rows] as const,
  () => {
    const h = props.highlight;
    if (!h) return;
    const r = props.rows.findIndex((row) => row.sequence === h.sequence);
    if (r < 0) return;
    pinned.value = { r, i: Math.max(0, props.nowIndex) };
    hover.value = null;
    nextTick(() => {
      const sc = scroller.value;
      if (sc) sc.scrollTop = Math.max(0, r * rowH.value - sc.clientHeight / 2);
    });
  }
);

// ---------- Day curve ----------
const curveMax = computed(() => {
  let max = 30;
  for (const v of [...props.curveToday, ...props.curveHistoric]) {
    if (v !== null && v > max) max = v;
  }
  return Math.ceil(max / 10) * 10;
});
const curveTicks = computed(() => {
  const ticks: number[] = [];
  for (let v = 10; v <= curveMax.value; v += 10) ticks.push(v);
  return ticks;
});
function yOf(v: number) {
  return CURVE_H - (v / curveMax.value) * (CURVE_H - 8);
}
const bars = computed(() =>
  props.curveToday.map((v, i) => {
    if (v === null || i > props.nowIndex) return null;
    const y = yOf(v);
    return { i, x: GUTTER_L + i * colW.value + 1, y, h: CURVE_H - y, w: Math.max(1, colW.value - 2) };
  })
);
const historicPath = computed(() => {
  let d = "";
  let open = false;
  props.curveHistoric.forEach((v, i) => {
    const x0 = GUTTER_L + i * colW.value;
    const x1 = x0 + colW.value;
    if (v === null) {
      open = false;
      return;
    }
    const y = yOf(v).toFixed(1);
    d += open ? `L${x0.toFixed(1)},${y}L${x1.toFixed(1)},${y}` : `M${x0.toFixed(1)},${y}L${x1.toFixed(1)},${y}`;
    open = true;
  });
  return d;
});

const hourTicks = computed(() => {
  const now = GUTTER_L + (props.nowIndex + 0.5) * colW.value;
  // Hide an hour label that would touch the NOW chip: chip half-width (~26px)
  // plus a label half-width (~10px) plus a little air.
  return Array.from({ length: 9 }, (_, k) => ({
    label: String(k * 3).padStart(2, "0"),
    x: GUTTER_L + k * (INTERVALS / 8) * colW.value,
  })).filter((t) => Math.abs(t.x - now) > 44);
});

// ---------- Interaction ----------
function indexFromX(x: number) {
  const i = Math.floor((x - GUTTER_L) / colW.value);
  return i >= 0 && i < INTERVALS ? i : null;
}
function onMatrixMove(e: MouseEvent) {
  const i = indexFromX(e.offsetX);
  const r = Math.floor(e.offsetY / rowH.value);
  hover.value = i === null || r < 0 || r >= props.rows.length ? null : { r, i };
}
function onCurveMove(e: MouseEvent) {
  const i = indexFromX(e.offsetX);
  hover.value = i === null ? null : { r: pinned.value?.r ?? null, i };
}
function onMatrixClick(e: MouseEvent) {
  const i = indexFromX(e.offsetX);
  const r = Math.floor(e.offsetY / rowH.value);
  if (i === null || r < 0 || r >= props.rows.length) return;
  pinned.value = pinned.value && pinned.value.r === r && pinned.value.i === i ? null : { r, i };
}
function onKey(e: KeyboardEvent) {
  if (!props.rows.length) return;
  const cur = pinned.value ?? { r: 0, i: Math.max(0, props.nowIndex) };
  const next = { ...cur };
  if (e.key === "ArrowLeft") next.i = Math.max(0, cur.i - 1);
  else if (e.key === "ArrowRight") next.i = Math.min(INTERVALS - 1, cur.i + 1);
  else if (e.key === "ArrowUp") next.r = Math.max(0, cur.r - 1);
  else if (e.key === "ArrowDown") next.r = Math.min(props.rows.length - 1, cur.r + 1);
  else if (e.key === "Enter" && pinned.value && props.shape !== null) {
    emit("open-map", { shape: props.shape, sequence: props.rows[cur.r].sequence });
    return;
  } else if (e.key === "Escape") {
    pinned.value = null;
    return;
  } else return;
  e.preventDefault();
  pinned.value = next;
  hover.value = null;
  const sc = scroller.value;
  if (sc) {
    const top = next.r * rowH.value;
    if (top < sc.scrollTop) sc.scrollTop = top;
    else if (top + rowH.value > sc.scrollTop + sc.clientHeight) sc.scrollTop = top + rowH.value - sc.clientHeight;
  }
}

const volMax = computed(() => {
  let max = 0;
  for (const v of props.curveVolume) if (v !== null && v > max) max = v;
  return max;
});
const volBars = computed(() =>
  props.curveVolume.map((v, i) => {
    if (v === null || i > props.nowIndex || !volMax.value) return null;
    const h = Math.max(1, (v / volMax.value) * (VOL_H - 4));
    return { i, x: GUTTER_L + i * colW.value + 1, y: VOL_H - h, h, w: Math.max(1, colW.value - 2) };
  })
);
const fmtInt = (n: number) => n.toLocaleString("es-CL");

const readout = computed(() => {
  const f = focus.value;
  if (!f) return null;
  const time = intervalLabel(f.i);
  const today = props.curveToday[f.i];
  const hist = props.curveHistoric[f.i];
  if (f.r === null || !props.rows[f.r]) {
    return {
      where: "Red",
      time,
      speed: today,
      historic: hist,
      ratio: today !== null && hist ? today / hist : null,
      volume: props.curveVolume[f.i],
      volumeScope: "buses en la red",
      sequence: null as number | null,
    };
  }
  const cell = props.rows[f.r].cells[f.i];
  const row = props.rows[f.r];
  return {
    where: `Seg ${String(row.sequence).padStart(2, "0")} · km ${row.startKm.toFixed(1)}`,
    time,
    speed: f.i > props.nowIndex ? null : cell.speed,
    historic: cell.historic,
    ratio: cell.speed !== null && cell.historic ? cell.speed / cell.historic : null,
    volume: f.i > props.nowIndex ? null : cell.volume,
    volumeScope: cell.volume === 1 ? "bus" : "buses",
    sequence: props.rows[f.r].sequence,
  };
});

const fmt = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "—" : v.toFixed(d));

function onShape(v: number) {
  emit("update:shape", v);
}
function onMode(v: ScaleMode) {
  emit("update:mode", v);
}

function openPinned() {
  if (!pinned.value || props.shape === null) return;
  emit("open-map", { shape: props.shape, sequence: props.rows[pinned.value.r].sequence });
}

const nowX = computed(() => GUTTER_L + (props.nowIndex + 0.5) * colW.value);
</script>

<template>
  <section class="st tile" aria-labelledby="st-title">
    <header class="st-head">
      <div class="st-title-row">
        <h2 id="st-title" class="caps st-title">Espacio-tiempo</h2>
        <el-select
          :model-value="shape ?? undefined"
          class="st-axis"
          placeholder="Eje"
          :disabled="!axes.length"
          @update:model-value="onShape"
        >
          <el-option v-for="a in axes" :key="a.shape" :value="a.shape" :label="a.name">
            <span class="axis-opt">
              <span class="axis-opt-name">{{ a.name }}</span>
              <span class="axis-opt-meta num">
                <span v-if="a.alerts" class="axis-flag">{{ a.alerts }} alerta{{ a.alerts > 1 ? "s" : "" }}</span>
                {{ a.below }}/{{ a.segments }} bajo hist.
              </span>
            </span>
          </el-option>
        </el-select>
      </div>
      <ScaleLegend :model-value="mode" compact @update:model-value="onMode" />
    </header>

    <div class="st-readout" aria-live="polite">
      <template v-if="readout">
        <span class="caps ro-where">{{ readout.where }}</span>
        <span class="num ro-time">{{ readout.time }}</span>
        <span class="num ro-speed">
          <b>{{ fmt(readout.speed) }}</b> / {{ fmt(readout.historic) }} km/h
        </span>
        <span class="num ro-ratio" :class="{ 'is-low': readout.ratio !== null && readout.ratio < 1 }">
          {{ readout.ratio === null ? "—" : `${Math.round(readout.ratio * 100)}% del histórico` }}
        </span>
        <span v-if="readout.volume !== null && readout.volume !== undefined" class="num ro-vol">
          {{ fmtInt(readout.volume) }} {{ readout.volumeScope }}
        </span>
        <button v-if="pinned && readout.sequence !== null" type="button" class="btn ro-map" @click="openPinned">
          <span class="material-icons" aria-hidden="true">map</span>
          Ver en mapa
        </button>
      </template>
      <template v-else>
        <span class="caps ro-hint">
          {{ currentAxis ? `${currentAxis.segments} segmentos` : "Sin ejes" }}
        </span>
        <span class="ro-hint-text">
          Pasa el cursor sobre una celda para leerla. Clic para fijarla y abrirla en el mapa.
        </span>
      </template>
    </div>

    <div ref="frame" class="st-frame">
      <span class="st-km-caption caps" aria-hidden="true">km</span>
      <div
        ref="scroller"
        class="st-matrix"
        :style="{ height: `${matrixH}px` }"
        tabindex="0"
        role="grid"
        :aria-label="`Matriz espacio-tiempo del eje ${
          currentAxis?.name ?? ''
        }: segmentos por intervalo de 7,5 minutos. Flechas para moverse, Enter para abrir en el mapa.`"
        @keydown="onKey"
      >
        <div class="st-canvas-wrap" :style="{ height: `${Math.max(canvasH, matrixH)}px` }">
          <canvas
            ref="canvas"
            class="st-canvas"
            @mousemove="onMatrixMove"
            @mouseleave="hover = null"
            @click="onMatrixClick"
          />
          <div
            v-if="focus && focus.r !== null"
            class="st-row-hl"
            :style="{
              top: `${focus.r * rowH}px`,
              height: `${rowH}px`,
              left: `${GUTTER_L - 1}px`,
              right: `${GUTTER_R - 1}px`,
            }"
          />
          <div
            v-if="pinned"
            class="st-cell-pin"
            :style="{
              top: `${pinned.r * rowH - 1}px`,
              height: `${rowH + 2}px`,
              left: `${GUTTER_L + pinned.i * colW - 1}px`,
              width: `${colW + 2}px`,
            }"
          />
        </div>

        <div v-if="seriesState === 'loading' && !rows.length" class="st-empty">
          <div class="skeleton st-skel" />
        </div>
        <div v-else-if="seriesState === 'error'" class="st-empty">
          <p>No se pudo cargar la serie del día.</p>
          <button type="button" class="btn" @click="emit('retry')">Reintentar</button>
        </div>
        <div v-else-if="!rows.length" class="st-empty">
          <p>Este eje no tiene segmentos con datos todavía.</p>
        </div>
      </div>

      <svg
        class="st-curve"
        :width="width"
        :height="CURVE_H"
        role="img"
        :aria-label="`Velocidad promedio de la red hoy por intervalo, comparada con el histórico ${historicLabel}`"
        @mousemove="onCurveMove"
        @mouseleave="hover = null"
      >
        <g class="curve-grid">
          <g v-for="t in curveTicks" :key="t">
            <line :x1="GUTTER_L" :x2="width - GUTTER_R" :y1="yOf(t)" :y2="yOf(t)" />
            <text :x="GUTTER_L - 10" :y="yOf(t)" text-anchor="end" dominant-baseline="middle">
              {{ t }}
            </text>
          </g>
          <line :x1="GUTTER_L" :x2="width - GUTTER_R" :y1="CURVE_H - 0.5" :y2="CURVE_H - 0.5" class="base" />
          <!-- Unit sits inside the plot, just above the top gridline. -->
          <text :x="GUTTER_L + 4" :y="yOf(curveMax) - 3" text-anchor="start" class="unit">km/h</text>
        </g>
        <g class="curve-bars">
          <template v-for="b in bars" :key="b ? b.i : undefined">
            <rect
              v-if="b"
              :x="b.x"
              :y="b.y"
              :width="b.w"
              :height="b.h"
              :class="{ 'is-now': b.i === nowIndex, 'is-focus': focus && focus.i === b.i }"
            />
          </template>
        </g>
        <path class="curve-hist" :d="historicPath" />
      </svg>

      <svg
        class="st-vol"
        :width="width"
        :height="VOL_H"
        role="img"
        :aria-label="`Buses distintos medidos en los ejes por intervalo; máximo de hoy ${fmtInt(volMax)}`"
        @mousemove="onCurveMove"
        @mouseleave="hover = null"
      >
        <text :x="GUTTER_L - 10" y="8" text-anchor="end" dominant-baseline="middle" class="vol-tick">
          {{ volMax ? fmtInt(volMax) : "" }}
        </text>
        <text :x="GUTTER_L - 10" :y="VOL_H - 6" text-anchor="end" dominant-baseline="middle" class="vol-tick">
          buses
        </text>
        <line :x1="GUTTER_L" :x2="width - GUTTER_R" :y1="VOL_H - 0.5" :y2="VOL_H - 0.5" class="vol-base" />
        <template v-for="b in volBars" :key="b ? b.i : undefined">
          <rect
            v-if="b"
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
            class="vol-bar"
            :class="{ 'is-now': b.i === nowIndex, 'is-focus': focus && focus.i === b.i }"
          />
        </template>
      </svg>

      <div class="st-axis-row" aria-hidden="true">
        <span v-for="t in hourTicks" :key="t.label" class="num" :style="{ left: `${t.x}px` }">
          {{ t.label }}
        </span>
      </div>

      <!-- NOW: one line through the matrix and the curve -->
      <div
        v-if="nowIndex >= 0 && width"
        class="st-now"
        :style="{ left: `${nowX}px`, top: '14px', height: `${matrixH + CURVE_H + VOL_GAP + VOL_H + 12}px` }"
        aria-hidden="true"
      >
        <span class="st-now-label num">{{ intervalLabel(nowIndex).slice(0, 5) }}</span>
      </div>
      <div
        v-if="focus && width"
        class="st-col-hl"
        :style="{
          left: `${GUTTER_L + focus.i * colW}px`,
          top: '14px',
          width: `${colW}px`,
          height: `${matrixH + CURVE_H + VOL_GAP + VOL_H + 8}px`,
        }"
        aria-hidden="true"
      />
    </div>

    <footer class="st-foot">
      <span class="st-key"> <span class="key-bar" /> Hoy, promedio de segmentos con dato </span>
      <span class="st-key"> <span class="key-line" /> Histórico {{ historicLabel }} </span>
      <span class="st-key"> <span class="key-vol" /> Buses distintos medidos </span>
      <span class="st-key"> <span class="key-now" /> Último intervalo con datos </span>
    </footer>
  </section>
</template>

<style scoped>
.st {
  display: flex;
  flex-direction: column;
  padding: var(--s-4) var(--s-4) var(--s-3);
  min-width: 0;
}
.st-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-4);
  flex-wrap: wrap;
}
.st-title-row {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  min-width: 0;
}
.st-title {
  margin: 0;
  white-space: nowrap;
}
.st-axis {
  width: 360px;
  max-width: 100%;
}
@media (max-width: 760px) {
  .st-title-row {
    flex-wrap: wrap;
    gap: var(--s-2);
    width: 100%;
  }
  .st-axis {
    width: 100%;
  }
}
.axis-opt {
  display: flex;
  justify-content: space-between;
  gap: var(--s-4);
  width: 100%;
}
.axis-opt-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.axis-opt-meta {
  color: var(--ink-3);
  font-size: var(--t-micro);
  display: inline-flex;
  gap: var(--s-2);
  align-items: center;
}
.axis-flag {
  color: var(--severe-ink);
  font-weight: 600;
}

.st-readout {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  min-height: 44px;
  margin: var(--s-3) 0 var(--s-2);
  padding: 0 0 var(--s-2);
  border-bottom: 1px solid var(--rule);
  font-size: var(--t-small);
  flex-wrap: wrap;
}
.ro-where {
  padding: 3px 8px;
  background: var(--ink);
  color: var(--ground);
}
.ro-time {
  color: var(--ink-2);
}
.ro-speed b {
  font-size: var(--t-title);
  font-weight: 600;
}
.ro-ratio {
  color: var(--ok-ink);
}
.ro-ratio.is-low {
  color: var(--severe-ink);
}
.ro-map {
  margin-left: auto;
  height: 30px;
}
.ro-hint {
  color: var(--ink-2);
}
.ro-hint-text {
  color: var(--ink-3);
}

.st-frame {
  position: relative;
  padding-top: 14px;
}
.st-km-caption {
  position: absolute;
  top: 0;
  left: 0;
  width: 34px;
  text-align: right;
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.st-matrix {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  outline-offset: 2px;
}
.st-canvas-wrap {
  position: relative;
}
.st-canvas {
  display: block;
  cursor: crosshair;
}
.st-row-hl {
  position: absolute;
  pointer-events: none;
  box-shadow: 0 0 0 1px var(--ink-2);
}
.st-cell-pin {
  position: absolute;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--ink), 0 0 0 3px var(--ground);
}
.st-empty {
  position: absolute;
  inset: 14px 8px 0 44px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--s-3);
  color: var(--ink-2);
  font-size: var(--t-small);
}
.st-empty p {
  margin: 0;
  max-width: 44ch;
}
.st-skel {
  width: 100%;
  height: 100%;
}

.st-curve {
  display: block;
  margin-top: 8px;
  overflow: visible;
}
.curve-grid line {
  stroke: var(--rule);
  stroke-width: 1;
}
.curve-grid line.base {
  stroke: var(--rule-strong);
}
.curve-grid text {
  fill: var(--ink-3);
  font-size: 10px;
  font-family: var(--font);
}
.curve-grid text.unit {
  font-size: var(--t-micro);
  letter-spacing: 0.04em;
  dominant-baseline: auto;
}
.curve-bars rect {
  fill: var(--ink-2);
  opacity: 0.55;
  transition: opacity var(--dur) var(--ease-out);
}
.curve-bars rect.is-focus {
  opacity: 1;
  fill: var(--ink);
}
.curve-bars rect.is-now {
  fill: var(--now);
  opacity: 1;
}
.st-vol {
  display: block;
  margin-top: 6px;
  overflow: visible;
}
.vol-tick {
  fill: var(--ink-3);
  font-size: var(--t-micro);
  font-family: var(--font);
}
.vol-base {
  stroke: var(--rule-strong);
}
.vol-bar {
  fill: var(--historic);
  opacity: 0.45;
}
.vol-bar.is-focus {
  opacity: 1;
  fill: var(--ink);
}
.vol-bar.is-now {
  fill: var(--now);
  opacity: 1;
}
.ro-vol {
  color: var(--ink-2);
}
.key-vol {
  width: 6px;
  height: 10px;
  background: var(--historic);
  opacity: 0.45;
}
.curve-hist {
  fill: none;
  stroke: var(--historic);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.st-axis-row {
  position: relative;
  height: 22px;
  margin-top: 4px;
}
.st-axis-row span {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  font-size: var(--t-micro);
  color: var(--ink-3);
}

.st-now {
  position: absolute;
  top: 0;
  width: 0;
  border-left: 2px solid var(--now-line);
  transform: translateX(-1px);
  pointer-events: none;
}
.st-now-label {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1px 6px;
  background: var(--now);
  color: var(--on-now);
  font-size: var(--t-micro);
  white-space: nowrap;
}
.st-col-hl {
  position: absolute;
  top: 0;
  pointer-events: none;
  background: var(--now-wash);
  mix-blend-mode: normal;
  opacity: 0.8;
}

.st-foot {
  display: flex;
  gap: var(--s-6);
  flex-wrap: wrap;
  margin-top: var(--s-2);
  padding-top: var(--s-2);
  border-top: 1px solid var(--rule);
  font-size: var(--t-micro);
  color: var(--ink-3);
  letter-spacing: 0.02em;
}
.st-key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.key-bar {
  width: 6px;
  height: 10px;
  background: var(--ink-2);
  opacity: 0.55;
}
.key-line {
  width: 16px;
  border-top: 1.5px dashed var(--historic);
}
.key-now {
  width: 2px;
  height: 12px;
  background: var(--now-line);
}
</style>
