<script setup lang="ts">
import AxisName from "@/components/common/AxisName.vue";
import { PLAUSIBLE_KMH, type SegmentNow } from "@/composables/useDashboardData";

const props = defineProps<{
  items: SegmentNow[];
  names: Map<number, string>;
  state: "idle" | "loading" | "ready" | "error";
  selectedShape: number | null;
  excluded: number;
}>();
const fullName = (shape: number) => props.names.get(shape) || `Shape ${shape}`;
const emit = defineEmits<{
  (e: "select", v: { shape: number; sequence: number }): void;
}>();

// Ratio bar spans 0..150% of historic; the 100% mark is the reference.
const SPAN = 1.5;
const pct = (r: number | null) => (r === null ? 0 : Math.min(1, r / SPAN) * 100);
</script>

<template>
  <section class="worst tile" aria-labelledby="worst-title">
    <header class="worst-head">
      <h2 id="worst-title" class="caps">Tramos más lentos vs. histórico</h2>
      <span class="caps worst-scale num">0 · 100% · 150%</span>
    </header>

    <ol v-if="items.length" class="worst-list">
      <li v-for="(s, idx) in items" :key="s.key">
        <button
          type="button"
          class="worst-row"
          :class="{ 'is-axis': s.shape === selectedShape }"
          @click="emit('select', { shape: s.shape, sequence: s.sequence })"
        >
          <span class="w-rank num">{{ String(idx + 1).padStart(2, "0") }}</span>
          <span class="w-where">
            <AxisName class="w-name" :name="fullName(s.shape)" />
            <span class="w-seg caps num">
              Seg {{ String(s.sequence).padStart(2, "0") }} · {{ s.volume }} {{ s.volume === 1 ? "bus" : "buses" }}
            </span>
          </span>
          <span class="w-speed num">
            <b>{{ s.speed?.toFixed(1) }}</b>
            <span>/ {{ s.historic?.toFixed(1) }}</span>
          </span>
          <span class="w-bar" aria-hidden="true">
            <span class="w-bar-fill" :style="{ width: `${pct(s.ratio)}%` }" />
            <span class="w-bar-ref" :style="{ left: `${(1 / SPAN) * 100}%` }" />
          </span>
          <span class="w-pct num">{{ Math.round((s.ratio ?? 0) * 100) }}%</span>
        </button>
      </li>
    </ol>
    <div v-else-if="state === 'loading'" class="worst-skel">
      <div v-for="n in 5" :key="n" class="skeleton" />
    </div>
    <p v-if="items.length && excluded" class="worst-note caps num">
      {{ excluded }} segmento{{ excluded > 1 ? "s" : "" }} bajo {{ PLAUSIBLE_KMH }} km/h fuera del ranking (lectura
      dudosa; se ven en el mapa)
    </p>
    <p v-else-if="!items.length && state !== 'loading'" class="worst-empty">
      Ningún segmento tiene velocidad e histórico en este intervalo, así que no hay con qué comparar.
    </p>
  </section>
</template>

<style scoped>
.worst {
  display: flex;
  flex-direction: column;
  padding: var(--s-4) var(--s-4) var(--s-2);
  min-height: 0;
}
.worst-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--s-3);
  margin-bottom: var(--s-2);
}
.worst-head h2 {
  margin: 0;
}
.worst-scale {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.worst-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}
.worst-row {
  width: 100%;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto 72px 38px;
  align-items: center;
  gap: var(--s-3);
  padding: 9px 0;
  border: 0;
  border-top: 1px solid var(--rule);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--dur) var(--ease-out);
}
li:first-child .worst-row {
  border-top: 0;
}
.worst-row:hover {
  background: var(--tile-2);
}
.worst-row.is-axis .w-rank {
  color: var(--ink);
}
.w-rank {
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.w-where {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.w-name {
  font-size: var(--t-small);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w-seg {
  color: var(--ink-3);
  font-size: var(--t-micro);
  display: flex;
  gap: var(--s-2);
  align-items: center;
}
.worst-note {
  margin: var(--s-2) 0 0;
  padding-top: var(--s-2);
  border-top: 1px solid var(--rule);
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.w-speed {
  font-size: var(--t-micro);
  color: var(--ink-3);
  white-space: nowrap;
}
.w-speed b {
  font-size: var(--t-small);
  color: var(--ink);
  font-weight: 600;
}
.w-bar {
  position: relative;
  height: 6px;
  background: var(--nodata);
}
.w-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--severe);
}
.w-bar-ref {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--ink-2);
}
.w-pct {
  text-align: right;
  font-size: var(--t-small);
  color: var(--severe-ink);
}
.worst-skel {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.worst-skel .skeleton {
  height: 34px;
}
@media (max-width: 760px) {
  .worst-row {
    grid-template-columns: 22px minmax(0, 1fr) auto;
    grid-template-areas:
      "rank where pct"
      "rank speed bar";
    row-gap: 4px;
  }
  .w-rank {
    grid-area: rank;
  }
  .w-where {
    grid-area: where;
  }
  .w-pct {
    grid-area: pct;
  }
  .w-speed {
    grid-area: speed;
  }
  .w-bar {
    grid-area: bar;
    width: 96px;
  }
}
.worst-empty {
  margin: var(--s-2) 0;
  color: var(--ink-2);
  font-size: var(--t-small);
  max-width: 48ch;
}
</style>
