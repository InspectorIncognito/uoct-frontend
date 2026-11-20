<script setup lang="ts">
import { RouterLink } from "vue-router";
import { FORM_URL } from "@/config";
import { computed } from "vue";
import AxisName from "@/components/common/AxisName.vue";
import { PLAUSIBLE_KMH, type AlertNow } from "@/composables/useDashboardData";

const SHOWN = 5;

const props = defineProps<{
  alerts: AlertNow[];
  names: Map<number, string>;
  state: "idle" | "loading" | "ready" | "error";
}>();
const emit = defineEmits<{
  (e: "select", v: { shape: number; sequence: number }): void;
}>();

// Slowest first: the list is a pointer to where to look, the map has them all.
// Slowest plausible readings first; readings under the ranking's floor are
// treated as doubtful here too and only fill the list if nothing else does.
const doubtful = (a: AlertNow) => a.speed === null || a.speed < PLAUSIBLE_KMH;
const doubtfulCount = computed(() => props.alerts.filter(doubtful).length);
const shown = computed(() =>
  [...props.alerts]
    .sort((a, b) => Number(doubtful(a)) - Number(doubtful(b)) || (a.speed ?? Infinity) - (b.speed ?? Infinity))
    .slice(0, SHOWN)
);

function votesShare(a: AlertNow) {
  const total = a.useful + a.useless;
  return total ? (a.useful / total) * 100 : 0;
}
function select(a: AlertNow) {
  if (a.shape !== null && a.sequence !== null) {
    emit("select", { shape: a.shape, sequence: a.sequence });
  }
}
</script>

<template>
  <section class="alerts tile" aria-labelledby="alerts-title">
    <header class="alerts-head">
      <h2 id="alerts-title" class="caps">
        Dónde están las alertas
        <span v-if="alerts.length" class="alerts-count num">
          {{ shown.length }} más lentas de {{ alerts.length }}
          <template v-if="doubtfulCount">· {{ doubtfulCount }} bajo {{ PLAUSIBLE_KMH }} km/h al final</template>
        </span>
      </h2>
      <a v-if="FORM_URL" :href="FORM_URL" target="_blank" rel="noopener noreferrer" class="caps alerts-form">
        Calificar alertas
        <span class="material-icons" aria-hidden="true">north_east</span>
      </a>
    </header>

    <ul v-if="alerts.length" class="alerts-list">
      <li v-for="(a, idx) in shown" :key="idx">
        <button type="button" class="alert-row" @click="select(a)">
          <span class="a-flag" aria-hidden="true" />
          <span class="a-where">
            <AxisName class="a-name" :name="a.shape !== null ? names.get(a.shape) || `Shape ${a.shape}` : 'Segmento'" />
            <span class="caps num a-seg">
              Seg {{ a.sequence !== null ? String(a.sequence).padStart(2, "0") : "—" }} ·
              {{ a.speed !== null ? `${a.speed.toFixed(1)} km/h` : "sin velocidad" }}
            </span>
          </span>
          <span
            class="a-vol num"
            :title="a.volume === null ? 'Sin volumen para este segmento' : 'Buses con que se calculó la velocidad'"
          >
            <b>{{ a.volume ?? "—" }}</b>
            <span class="caps">{{ a.volume === 1 ? "bus" : "buses" }}</span>
          </span>
          <span class="a-votes num" :title="`${a.useful} útil, ${a.useless} no útil`">
            <span class="a-vote-bar" aria-hidden="true">
              <span :style="{ width: `${votesShare(a)}%` }" />
            </span>
            <span class="a-vote-text">
              <span class="material-icons" aria-hidden="true">thumb_up</span>{{ a.useful }}
              <span class="material-icons" aria-hidden="true">thumb_down</span>{{ a.useless }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <RouterLink v-if="alerts.length" to="/map" class="caps alerts-map">
      <span class="material-icons" aria-hidden="true">map</span>
      Ver las {{ alerts.length }} en el mapa
    </RouterLink>
    <div v-else-if="state === 'loading'" class="alerts-skel">
      <div v-for="n in 3" :key="n" class="skeleton" />
    </div>
    <div v-else class="alerts-empty">
      <p>
        Sin alertas en los últimos 7,5 minutos. Se genera una alerta cuando la velocidad de un segmento cae bajo su
        histórico dividido por el umbral.
      </p>
      <RouterLink to="/configuration" class="caps alerts-link">Revisar umbral</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.alerts {
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
}
.alerts-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--s-2);
}
.alerts-head h2 {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
}
.alerts-count {
  color: var(--ink-3);
  font-size: var(--t-micro);
  font-weight: 400;
}
.alerts-map {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--s-2);
  padding-top: var(--s-2);
  border-top: 1px solid var(--rule);
  color: var(--ink-2);
  text-decoration: none;
  font-size: var(--t-micro);
}
.alerts-map:hover {
  color: var(--ink);
}
.alerts-map .material-icons {
  font-size: 15px;
}
.alerts-form {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--ink-2);
  text-decoration: none;
  font-size: var(--t-micro);
}
.alerts-form:hover {
  color: var(--ink);
}
.alerts-form .material-icons {
  font-size: 14px;
}
.alerts-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.alert-row {
  width: 100%;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  gap: var(--s-3);
  align-items: center;
  padding: 9px 0;
  border: 0;
  border-top: 1px solid var(--rule);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
li:first-child .alert-row {
  border-top: 0;
}
.alert-row:hover {
  background: var(--tile-2);
}
.a-flag {
  width: 10px;
  height: 10px;
  background: var(--severe);
}
.a-where {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.a-name {
  font-size: var(--t-small);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.a-vol {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
  min-width: 44px;
}
.a-vol b {
  font-size: var(--t-title);
  font-weight: 500;
}
.a-vol .caps {
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.a-seg {
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.a-votes {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: var(--t-micro);
  color: var(--ink-2);
}
.a-vote-bar {
  width: 72px;
  height: 4px;
  background: var(--nodata);
  position: relative;
}
.a-vote-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--ink-2);
}
.a-vote-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.a-vote-text .material-icons {
  font-size: 13px;
  margin-left: 4px;
}
.alerts-empty {
  color: var(--ink-2);
  font-size: var(--t-small);
}
.alerts-empty p {
  margin: 0 0 var(--s-3);
  max-width: 52ch;
}
.alerts-link {
  color: var(--ink);
  font-size: var(--t-micro);
}
.alerts-skel {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.alerts-skel .skeleton {
  height: 34px;
}
</style>
