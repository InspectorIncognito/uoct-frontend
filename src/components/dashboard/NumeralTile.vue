<script setup lang="ts">
defineProps<{
  label: string;
  value: string | null;
  denom?: string | null;
  unit?: string;
  variant?: "default" | "inverse" | "severe";
  state?: "idle" | "loading" | "ready" | "error";
}>();
defineEmits<{ (e: "retry"): void }>();
</script>

<template>
  <section class="numeral tile" :class="`numeral--${variant ?? 'default'}`">
    <header class="numeral-head">
      <h3 class="caps numeral-label">{{ label }}</h3>
      <slot name="aside" />
    </header>

    <div v-if="state === 'loading' && value === null" class="numeral-skeleton skeleton" />
    <div v-else-if="state === 'error' && value === null" class="numeral-error">
      <span>Sin respuesta del servidor.</span>
      <button type="button" class="btn" @click="$emit('retry')">Reintentar</button>
    </div>
    <div v-else class="numeral-body">
      <span class="numeral-value num">{{ value ?? "—" }}</span>
      <span v-if="denom || unit" class="numeral-denom num caps">
        <template v-if="denom">/ {{ denom }}</template>
        <template v-if="unit">&nbsp;{{ unit }}</template>
      </span>
    </div>

    <footer v-if="$slots.foot" class="numeral-foot">
      <slot name="foot" />
    </footer>
  </section>
</template>

<style scoped>
.numeral {
  display: flex;
  flex-direction: column;
  padding: var(--s-4) var(--s-4) var(--s-3);
  min-height: 148px;
  color: var(--ink);
}
.numeral--inverse {
  background: var(--inverse);
  color: var(--on-inverse);
}
.numeral--severe {
  background: var(--severe);
  color: var(--on-severe);
}
.numeral-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--s-2);
}
.numeral-label {
  margin: 0;
  font-weight: 500;
}
.numeral-body {
  margin-top: auto;
  padding-top: var(--s-4);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-1) var(--s-3);
}
.numeral-value {
  font-size: var(--t-num-l);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.03em;
  font-variation-settings: "wdth" 100;
}
.numeral-denom {
  font-size: var(--t-small);
  white-space: nowrap;
  opacity: 0.85;
}
.numeral-foot {
  margin-top: var(--s-3);
  padding-top: var(--s-2);
  border-top: 1px solid currentColor;
  border-top-color: color-mix(in srgb, currentColor 22%, transparent);
  font-size: var(--t-label);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-variation-settings: "wdth" 87.5;
  display: flex;
  justify-content: space-between;
  gap: var(--s-2);
  opacity: 0.9;
}
.numeral--default .numeral-foot {
  color: var(--ink-2);
}
@media (max-width: 760px) {
  .numeral {
    padding: var(--s-3);
    min-height: 132px;
  }
  .numeral-value {
    font-size: var(--t-num-m);
  }
}
.numeral-skeleton {
  margin-top: auto;
  height: 46px;
  width: 60%;
}
.numeral-error {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--ink-2);
}
</style>
