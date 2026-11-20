<script setup lang="ts">
import { computed } from "vue";
import AxisName from "@/components/common/AxisName.vue";
import type { AxisSummary } from "@/composables/useDashboardData";

const props = defineProps<{
  axes: AxisSummary[];
  withData: number;
  total: number;
  state: "idle" | "loading" | "ready" | "error";
}>();
const emit = defineEmits<{ (e: "select", shape: number): void }>();

const share = computed(() => (props.total ? Math.round((props.withData / props.total) * 100) : null));
// Least covered axes first: that is where the reading is weakest.
const rows = computed(() =>
  [...props.axes]
    .map((a) => ({ ...a, cov: a.segments ? a.withData / a.segments : 0 }))
    .sort((a, b) => a.cov - b.cov || a.name.localeCompare(b.name))
);
</script>

<template>
  <section class="cov tile" aria-labelledby="cov-title">
    <header class="cov-head">
      <h2 id="cov-title" class="caps">Cobertura de datos</h2>
      <span class="caps cov-scope">Intervalo en curso</span>
    </header>

    <div v-if="state === 'loading' && !total" class="skeleton cov-skel" />
    <div v-else class="cov-num">
      <span class="cov-value num">{{ withData }}</span>
      <span class="cov-denom caps num">/ {{ total }} seg. · {{ share ?? "—" }}%</span>
    </div>

    <ol v-if="rows.length" class="cov-list" aria-label="Cobertura por eje">
      <li v-for="a in rows" :key="a.shape">
        <button type="button" class="cov-row" @click="emit('select', a.shape)">
          <AxisName class="c-name" :name="a.name" />
          <span class="c-bar" aria-hidden="true">
            <span class="c-fill" :style="{ transform: `scaleX(${a.cov})` }" />
          </span>
          <span class="c-val num">{{ a.withData }}/{{ a.segments }}</span>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.cov {
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cov-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.cov-head h2 {
  margin: 0;
}
.cov-scope {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.cov-num {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-3) 0 var(--s-3);
  border-bottom: 1px solid var(--rule);
}
.cov-value {
  font-size: var(--t-num-m);
  line-height: 1;
  letter-spacing: -0.03em;
}
.cov-denom {
  color: var(--ink-2);
}
.cov-skel {
  height: 48px;
  margin: var(--s-3) 0;
}
.cov-list {
  list-style: none;
  margin: 0;
  padding: var(--s-1) 0 0;
  max-height: 232px;
  overflow-y: auto;
}
.cov-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 48px;
  gap: var(--s-3);
  align-items: center;
  padding: 5px 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: var(--t-micro);
}
.cov-row:hover {
  background: var(--tile-2);
}
.c-name {
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.c-bar {
  position: relative;
  height: 4px;
  background: var(--nodata);
}
.c-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  background: var(--ink-2);
  transition: transform 400ms var(--ease-out);
}
.c-val {
  text-align: right;
  color: var(--ink-3);
}
</style>
