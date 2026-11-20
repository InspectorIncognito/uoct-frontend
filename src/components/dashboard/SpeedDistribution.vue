<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "@/stores/theme";
import type { SegmentNow } from "@/composables/useDashboardData";
import { binIndex, bins, modeUnit, NO_DATA_COLOR, ramp, type ScaleMode } from "@/utils/speedScale";

const props = defineProps<{ segments: SegmentNow[]; mode: ScaleMode }>();
const themeStore = useThemeStore();

const rows = computed(() => {
  const list = bins(props.mode);
  const colors = ramp(themeStore.theme);
  const counts = new Array(list.length).fill(0);
  let none = 0;
  for (const s of props.segments) {
    const v = props.mode === "kmh" ? s.speed : s.ratio;
    const idx = binIndex(v, props.mode);
    if (idx < 0) none++;
    else counts[idx]++;
  }
  const max = Math.max(1, ...counts, none);
  return [
    ...list.map((b, i) => ({ label: b.label, count: counts[i], color: colors[i], share: counts[i] / max })),
    { label: "Sin datos", count: none, color: NO_DATA_COLOR[themeStore.theme], share: none / max },
  ];
});
</script>

<template>
  <section class="dist tile" aria-labelledby="dist-title">
    <header class="dist-head">
      <h2 id="dist-title" class="caps">Segmentos por rango</h2>
      <span class="caps dist-unit">{{ modeUnit(mode) }}</span>
    </header>
    <ol class="dist-list">
      <li v-for="r in rows" :key="r.label" class="dist-row">
        <span class="d-label num">{{ r.label }}</span>
        <span class="d-track">
          <span
            class="d-fill"
            :style="{
              transform: `scaleX(${r.count ? Math.max(r.share, 0.01) : 0})`,
              background: r.color,
            }"
          />
        </span>
        <span class="d-count num">{{ r.count }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.dist {
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
}
.dist-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--s-3);
}
.dist-head h2 {
  margin: 0;
}
.dist-unit {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.dist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dist-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 36px;
  align-items: center;
  gap: var(--s-3);
  font-size: var(--t-small);
}
.d-label {
  color: var(--ink-2);
  font-size: var(--t-micro);
}
.d-track {
  height: 10px;
  position: relative;
}
.d-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transition: transform 400ms var(--ease-out);
}
.d-count {
  text-align: right;
}
</style>
