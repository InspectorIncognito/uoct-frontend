<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "@/stores/theme";
import { bins, NO_DATA_COLOR, ramp, type ScaleMode } from "@/utils/speedScale";

const props = withDefaults(
  defineProps<{
    modelValue: ScaleMode;
    compact?: boolean;
    showToggle?: boolean;
    /** Segments per bin, in scale order. Turns the legend into the distribution of what is on screen. */
    counts?: number[] | null;
    noDataCount?: number;
    /** Isolated bin (index in the scale, -1 for "Sin datos"); null shows every bin. */
    active?: number | null;
  }>(),
  {
    compact: false,
    showToggle: true,
    counts: null,
    noDataCount: 0,
    active: undefined,
  }
);
const emit = defineEmits<{
  (e: "update:modelValue", v: ScaleMode): void;
  (e: "update:active", v: number | null): void;
}>();

const filterable = computed(() => props.active !== undefined);
function toggle(index: number) {
  emit("update:active", props.active === index ? null : index);
}

const themeStore = useThemeStore();
const chips = computed(() => {
  const colors = ramp(themeStore.theme);
  return bins(props.modelValue).map((b, i) => ({
    index: i,
    label: b.label,
    color: colors[i],
    count: props.counts ? props.counts[i] ?? 0 : null,
    nodata: false,
  }));
});
const noData = computed(() => NO_DATA_COLOR[themeStore.theme]);
const entries = computed(() => [
  ...chips.value,
  {
    index: -1,
    label: "Sin datos",
    color: noData.value,
    count: props.counts ? props.noDataCount : null,
    nodata: true,
  },
]);
const total = computed(() => entries.value.reduce((sum, e) => sum + (e.count ?? 0), 0));
</script>

<template>
  <div class="legend" :class="{ 'legend--compact': compact }">
    <div v-if="showToggle" class="seg" role="radiogroup" aria-label="Escala de color">
      <button
        type="button"
        role="radio"
        class="seg-btn caps"
        :aria-checked="modelValue === 'kmh'"
        :class="{ 'is-on': modelValue === 'kmh' }"
        @click="emit('update:modelValue', 'kmh')"
      >
        km/h
      </button>
      <button
        type="button"
        role="radio"
        class="seg-btn caps"
        :aria-checked="modelValue === 'ratio'"
        :class="{ 'is-on': modelValue === 'ratio' }"
        @click="emit('update:modelValue', 'ratio')"
      >
        % hist.
      </button>
    </div>
    <div class="scale">
      <div v-if="counts && total" class="strip" aria-hidden="true">
        <span
          v-for="e in entries"
          :key="e.index"
          class="strip-part"
          :class="{ 'is-nodata': e.nodata, 'is-dim': active != null && active !== e.index }"
          :style="{ flexGrow: e.count ?? 0, background: e.color }"
        />
      </div>
      <ol class="chips" :aria-label="modelValue === 'kmh' ? 'Escala en km/h' : 'Escala en % del histórico'">
        <li v-for="e in entries" :key="e.index">
          <component
            :is="filterable ? 'button' : 'span'"
            class="chip"
            :class="{ 'is-dim': active != null && active !== e.index, 'is-on': active === e.index }"
            v-bind="
              filterable
                ? {
                    type: 'button',
                    'aria-pressed': active === e.index,
                    title: active === e.index ? 'Mostrar todos los rangos' : 'Aislar este rango en el mapa',
                  }
                : {}
            "
            @click="filterable && toggle(e.index)"
          >
            <span class="chip-swatch" :class="{ 'chip-swatch--nodata': e.nodata }" :style="{ background: e.color }" />
            <span class="chip-label num">{{ e.label }}</span>
            <span v-if="e.count !== null" class="chip-count num">{{ e.count }}</span>
          </component>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  flex-wrap: wrap;
}
.seg {
  display: inline-flex;
  border: 1px solid var(--rule-strong);
  border-radius: var(--radius);
}
.seg-btn {
  height: 28px;
  padding: 0 var(--s-3);
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  transition: background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
}
.seg-btn + .seg-btn {
  border-left: 1px solid var(--rule-strong);
}
.seg-btn:hover {
  color: var(--ink);
}
.seg-btn.is-on {
  background: var(--ink);
  color: var(--ground);
}
.scale {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
/* One bar for the whole network: each part is as wide as its share of segments. */
.strip {
  display: flex;
  gap: 1px;
  height: 6px;
}
.strip-part {
  min-width: 0;
  transition: flex-grow 420ms var(--ease-out), opacity var(--dur) var(--ease-out);
}
.strip-part.is-nodata {
  background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--nodata-hatch) 2px 3px) !important;
}
.strip-part.is-dim {
  opacity: 0.25;
}
.chips {
  display: flex;
  gap: var(--s-1) var(--s-3);
  margin: 0;
  padding: 0;
  list-style: none;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: var(--t-micro);
  color: var(--ink-2);
  letter-spacing: 0.02em;
  transition: opacity var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
}
button.chip {
  cursor: pointer;
  /* 24px tall hit area without growing the row. */
  padding: 7px 0;
  margin: -7px 0;
}
button.chip:hover,
.chip.is-on {
  color: var(--ink);
}
.chip.is-on .chip-label {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.chip.is-dim {
  opacity: 0.45;
}
.chip-count {
  color: var(--ink);
  font-weight: 600;
}
.chip-swatch {
  width: 14px;
  height: 8px;
}
.chip-swatch--nodata {
  background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--nodata-hatch) 2px 3px) !important;
}
.legend--compact .chips {
  gap: var(--s-2);
}
</style>
