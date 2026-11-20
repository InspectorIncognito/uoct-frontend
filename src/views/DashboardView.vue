<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import NumeralTile from "@/components/dashboard/NumeralTile.vue";
import SpaceTimeTile from "@/components/dashboard/SpaceTimeTile.vue";
import WorstSegments from "@/components/dashboard/WorstSegments.vue";
import SpeedDistribution from "@/components/dashboard/SpeedDistribution.vue";
import AlertsTile from "@/components/dashboard/AlertsTile.vue";
import CoverageTile from "@/components/dashboard/CoverageTile.vue";
import VolumeTile from "@/components/dashboard/VolumeTile.vue";
import { INTERVALS, isStale, useDashboardData } from "@/composables/useDashboardData";
import { intervalLabel, scheduleRefresh, useLiveStore } from "@/stores/live";
import { temporalSegmentFromUTCIndex } from "@/utils/date_utils";

const router = useRouter();
const live = useLiveStore();
const data = useDashboardData();

const mode = data.scaleMode;
const shape = data.selectedShape;
const highlight = ref<{ sequence: number; token: number } | null>(null);
const refreshing = ref(false);

// Keep the operator's axis; otherwise follow the axis with the most trouble.
watch(
  () => data.axes.value,
  (axes) => {
    if (!axes.length) return;
    if (shape.value === null || !axes.some((a) => a.shape === shape.value)) {
      shape.value = axes[0].shape;
    }
  },
  { immediate: true }
);

const rows = computed(() => (shape.value === null ? [] : data.matrixFor(shape.value)));

const nowIndex = computed(() => {
  if (data.fallbackIndex.value !== null) return data.fallbackIndex.value;
  if (data.nowUtcIndex.value !== null) {
    return temporalSegmentFromUTCIndex(data.nowUtcIndex.value, new Date());
  }
  // The live interval can arrive empty for a few minutes after it closes;
  // fall back to the last interval the day series already has.
  return data.lastSeriesIndex.value ?? Math.max(0, live.intervalIndex - 1);
});

const waitingLive = data.liveEmpty;
// The interval that just closed and is still being processed server-side.
const pendingIndex = computed(() => (live.intervalIndex - 1 + INTERVALS) % INTERVALS);
const hasCompared = computed(() => data.compared.value.length > 0);

const fmt = (v: number | null, d = 1) => (v === null ? null : v.toFixed(d));

const deltaPct = computed(() => {
  const s = data.networkSpeed.value;
  const h = data.networkHistoric.value;
  if (s === null || h === null || h === 0) return null;
  return Math.round((s / h - 1) * 100);
});

const belowShare = computed(() => {
  const n = data.compared.value.length;
  return n ? Math.round((data.belowHistoric.value / n) * 100) : null;
});

const historicLabel = computed(() =>
  data.historicMonthLabel.value
    ? `${data.historicMonthLabel.value.toLowerCase()}, ${data.dayTypeLabel.value.toLowerCase()}`
    : ""
);

function focusAxis(v: number) {
  shape.value = v;
}

function focusSegment(v: { shape: number; sequence: number }) {
  shape.value = v.shape;
  highlight.value = { sequence: v.sequence, token: Date.now() };
}

function openMap(v: { shape: number; sequence: number }) {
  router.push({ name: "map", query: { shape: String(v.shape), seq: String(v.sequence) } });
}

async function refresh(full = false) {
  refreshing.value = true;
  await data.refresh(full);
  refreshing.value = false;
}

watch(
  () => data.updatedAt.value,
  (d) => d && live.markUpdated(d)
);

// While the closed interval is still empty, check again every 2 minutes.
let liveRetry: ReturnType<typeof setTimeout> | null = null;
watch(waitingLive, (waiting) => {
  if (liveRetry) clearTimeout(liveRetry);
  liveRetry = null;
  if (waiting) {
    liveRetry = setTimeout(async function retry() {
      await data.loadLive();
      liveRetry = waitingLive.value ? setTimeout(retry, 2 * 60 * 1000) : null;
    }, 2 * 60 * 1000);
  }
});

let stopRefresh: (() => void) | null = null;
onMounted(() => {
  // Reuse the session's data; only fetch when nothing is loaded yet or a new
  // cut has happened since the last load.
  const first = data.updatedAt.value === null;
  if (first || isStale(data.updatedAt.value)) refresh(first);
  if (data.updatedAt.value) live.markUpdated(data.updatedAt.value);
  stopRefresh = scheduleRefresh(() => refresh());
});
onUnmounted(() => {
  stopRefresh?.();
  stopRefresh = null;
  if (liveRetry) clearTimeout(liveRetry);
});
</script>

<template>
  <div class="panel">
    <header class="panel-head">
      <div class="panel-title">
        <h1>Estado de la red</h1>
        <p class="panel-context caps num">
          <span>{{ data.dayTypeLabel.value || "—" }}</span>
          <span>Lecturas de {{ intervalLabel(nowIndex) }}</span>
          <span>{{ data.segments.value.length }} segmentos en {{ data.axes.value.length }} ejes</span>
        </p>
        <Transition name="notice">
          <p v-if="waitingLive" class="panel-notice" role="status">
            <span class="material-icons" aria-hidden="true">hourglass_top</span>
            <span v-if="data.fallbackIndex.value !== null">
              El intervalo {{ intervalLabel(pendingIndex) }} todavía se procesa en el servidor (unos 5 min). El panel
              muestra {{ intervalLabel(data.fallbackIndex.value) }} y reintenta cada 2 min.
            </span>
            <span v-else>
              Las velocidades del último intervalo todavía no llegan del servidor (unos 5 min). Se reintenta cada 2 min.
            </span>
          </p>
        </Transition>
      </div>
      <button type="button" class="btn" :disabled="refreshing" @click="refresh()">
        <span class="material-icons" :class="{ spin: refreshing }" aria-hidden="true">
          {{ refreshing ? "progress_activity" : "refresh" }}
        </span>
        {{ refreshing ? "Actualizando" : "Actualizar" }}
      </button>
    </header>

    <div class="panel-grid">
      <SpaceTimeTile
        v-model:shape="shape"
        v-model:mode="mode"
        class="a-st"
        :axes="data.axes.value"
        :rows="rows"
        :curve-today="data.dayCurve.value.today"
        :curve-historic="data.dayCurve.value.historic"
        :curve-volume="data.dayVolume.value"
        :now-index="nowIndex"
        :series-state="data.seriesState.value"
        :historic-label="historicLabel"
        :highlight="highlight"
        @open-map="openMap"
        @retry="data.loadSeries()"
      />

      <div class="a-kpi">
        <NumeralTile
          label="Velocidad de la red"
          :value="fmt(data.networkSpeed.value)"
          :denom="fmt(data.networkHistoric.value)"
          unit="km/h"
          :state="data.liveState.value"
          @retry="data.loadLive()"
        >
          <template #foot>
            <span>
              {{
                deltaPct === null
                  ? data.compared.value.length
                    ? "Sin histórico"
                    : "Sin datos del intervalo"
                  : `${deltaPct > 0 ? "+" : ""}${deltaPct}% vs histórico`
              }}
            </span>
            <span v-if="hasCompared" class="num">{{ data.compared.value.length }} seg.</span>
          </template>
        </NumeralTile>

        <NumeralTile
          label="Bajo su histórico"
          variant="inverse"
          :value="data.liveState.value === 'ready' && hasCompared ? String(data.belowHistoric.value) : null"
          :denom="hasCompared ? String(data.compared.value.length) : null"
          unit="seg."
          :state="data.liveState.value"
          @retry="data.loadLive()"
        >
          <template #foot>
            <span>{{ belowShare === null ? "Sin segmentos comparables" : `${belowShare}% de los comparados` }}</span>
          </template>
        </NumeralTile>

        <NumeralTile
          label="Alertas activas"
          :variant="data.alerts.value.length ? 'severe' : 'default'"
          :value="data.liveState.value === 'ready' ? String(data.alerts.value.length) : null"
          :state="data.liveState.value"
          @retry="data.loadLive()"
        >
          <template #foot>
            <span class="num">{{ data.feedback.value.useful }} útil</span>
            <span class="num">{{ data.feedback.value.useless }} no útil</span>
          </template>
        </NumeralTile>

        <NumeralTile
          label="Buses con GPS"
          :value="data.buses.value === null ? null : String(data.buses.value)"
          :state="data.busState.value"
          @retry="data.loadBuses()"
        >
          <template #foot>
            <span class="num">{{ data.services.value ?? "—" }} servicios</span>
            <span>{{ data.busWindow.value === "minute" ? "1 min" : "7,5 min" }}</span>
          </template>
        </NumeralTile>
      </div>

      <WorstSegments
        class="a-worst"
        :items="data.worst.value"
        :names="data.shapeNames.value"
        :state="data.liveState.value"
        :selected-shape="shape"
        :excluded="data.implausible.value"
        @select="focusSegment"
      />

      <VolumeTile class="a-vol" :stats="data.volumeStats.value" :state="data.liveState.value" />

      <SpeedDistribution class="a-dist" :segments="data.segments.value" :mode="mode" />

      <AlertsTile
        class="a-alerts"
        :alerts="data.alerts.value"
        :names="data.shapeNames.value"
        :state="data.liveState.value"
        @select="focusSegment"
      />

      <CoverageTile
        class="a-cov"
        :axes="data.axes.value"
        :with-data="data.withData.value.length"
        :total="data.segments.value.length"
        :state="data.liveState.value"
        @select="focusAxis"
      />
    </div>
  </div>
</template>

<style scoped>
.panel {
  padding: var(--s-4) var(--gap) var(--s-6);
  max-width: 1760px;
  width: 100%;
  margin: 0 auto;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  padding: var(--s-2) var(--s-2) var(--s-4);
}
.panel-title h1 {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.panel-context {
  margin: var(--s-2) 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--s-4);
  color: var(--ink-3);
}
.panel-notice {
  display: flex;
  gap: var(--s-2);
  align-items: flex-start;
  margin: var(--s-3) 0 0;
  max-width: 96ch;
  padding: var(--s-2) var(--s-3);
  background: var(--now-wash);
  font-size: var(--t-small);
  color: var(--ink);
}
.panel-notice .material-icons {
  font-size: 18px;
  color: var(--now-line);
}
.notice-enter-active,
.notice-leave-active {
  transition: opacity var(--dur) var(--ease-out), clip-path 320ms var(--ease-out);
}
.notice-enter-from,
.notice-leave-to {
  opacity: 0;
  clip-path: inset(0 100% 0 0);
}
.panel-context span + span::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-right: var(--s-4);
  vertical-align: middle;
  background: var(--rule-strong);
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-areas:
    "st st st st st st st st kpi kpi kpi kpi"
    "st st st st st st st st worst worst worst worst"
    "vol vol vol dist dist dist alerts alerts alerts cov cov cov";
  grid-template-rows: auto 1fr auto;
  gap: var(--gap);
}
.a-st {
  grid-area: st;
}
.a-kpi {
  grid-area: kpi;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
}
.a-worst {
  grid-area: worst;
}
.a-dist {
  grid-area: dist;
}
.a-vol {
  grid-area: vol;
}
.a-alerts {
  grid-area: alerts;
}
.a-cov {
  grid-area: cov;
}

@media (max-width: 1240px) {
  .panel-grid {
    grid-template-areas:
      "kpi kpi kpi kpi kpi kpi kpi kpi kpi kpi kpi kpi"
      "st st st st st st st st st st st st"
      "worst worst worst worst worst worst alerts alerts alerts alerts alerts alerts"
      "vol vol vol vol vol vol dist dist dist dist dist dist"
      "cov cov cov cov cov cov cov cov cov cov cov cov";
    grid-template-rows: none;
  }
  .a-kpi {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .panel-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .panel-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "kpi" "st" "worst" "alerts" "vol" "dist" "cov";
  }
  .a-kpi {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
