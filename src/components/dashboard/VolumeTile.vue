<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  stats: {
    buses: number;
    passages: number;
    median: number | null;
    single: number;
    measured: number;
    bins: { label: string; count: number }[];
  };
  state: "idle" | "loading" | "ready" | "error";
}>();

const fmt = (n: number) => n.toLocaleString("es-CL");
const maxBin = computed(() => Math.max(1, ...props.stats.bins.map((b) => b.count)));
const singleShare = computed(() =>
  props.stats.measured ? Math.round((props.stats.single / props.stats.measured) * 100) : null
);
</script>

<template>
  <section class="vol tile" aria-labelledby="vol-title">
    <header class="vol-head">
      <h2 id="vol-title" class="caps">Volumen de buses</h2>
      <span class="caps vol-scope">Intervalo en curso</span>
    </header>

    <div v-if="state === 'loading' && !stats.measured" class="skeleton vol-skel" />
    <template v-else>
      <div class="vol-num">
        <span class="vol-value num">{{ fmt(stats.buses) }}</span>
        <span class="vol-denom caps num">buses medidos</span>
      </div>

      <dl class="vol-facts num">
        <div>
          <dt class="caps">Pasadas</dt>
          <dd>{{ fmt(stats.passages) }}</dd>
        </div>
        <div>
          <dt class="caps" title="Mediana de buses por segmento">Mediana</dt>
          <dd>
            {{ stats.median === null ? "—" : stats.median.toLocaleString("es-CL", { maximumFractionDigits: 1 }) }}
          </dd>
        </div>
        <div :class="{ 'is-warn': stats.single > 0 }">
          <dt class="caps">Con 1 bus</dt>
          <dd>
            {{ fmt(stats.single) }}<span> / {{ fmt(stats.measured) }}</span>
          </dd>
        </div>
      </dl>

      <ol class="vol-bins" aria-label="Segmentos según cantidad de buses">
        <li v-for="b in stats.bins" :key="b.label" class="vol-bin">
          <span class="vb-label num">{{ b.label }}</span>
          <span class="vb-track">
            <span class="vb-fill" :style="{ transform: `scaleX(${b.count / maxBin})` }" />
          </span>
          <span class="vb-count num">{{ fmt(b.count) }}</span>
        </li>
      </ol>

      <p v-if="singleShare !== null && stats.single" class="vol-note">
        El {{ singleShare }}% de las velocidades del intervalo sale de un solo bus: léelas con cautela.
      </p>
    </template>
  </section>
</template>

<style scoped>
.vol {
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
}
.vol-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.vol-head h2 {
  margin: 0;
}
.vol-scope {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.vol-skel {
  height: 48px;
  margin: var(--s-3) 0;
}
.vol-num {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-3) 0;
}
.vol-value {
  font-size: var(--t-num-m);
  line-height: 1;
  letter-spacing: -0.03em;
}
.vol-denom {
  color: var(--ink-2);
}
.vol-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
  margin: 0;
  padding: var(--s-3) 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.vol-facts dt {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.vol-facts dd {
  margin: 2px 0 0;
  font-size: var(--t-title);
}
.vol-facts dd span {
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.vol-facts .is-warn dd {
  color: var(--now-line);
}
.vol-bins {
  list-style: none;
  margin: var(--s-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vol-bin {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 40px;
  gap: var(--s-3);
  align-items: center;
}
.vb-label {
  color: var(--ink-2);
  font-size: var(--t-micro);
}
.vb-track {
  position: relative;
  height: 8px;
}
.vb-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--historic);
  transition: transform 400ms var(--ease-out);
}
.vb-count {
  text-align: right;
  font-size: var(--t-small);
}
.vol-note {
  margin: var(--s-3) 0 0;
  font-size: var(--t-micro);
  color: var(--ink-2);
  max-width: 48ch;
}
</style>
