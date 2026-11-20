<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ThresholdAPI from "@/components/api/ThresholdAPI";
import { ElNotification } from "element-plus";

const threshold = ref<number | null>(null);
const saved = ref<number | null>(null);
const loading = ref(true);
const loadError = ref(false);
const saving = ref(false);

const EXAMPLE_HISTORIC = 20; // km/h, illustrative only
const SPAN = 1.5; // bar spans 0..150% of the historic

const valid = computed(() => threshold.value !== null && Number.isFinite(threshold.value) && threshold.value > 0);
// Allowed, but worth a warning: at 1 or below every slowdown (or more) alerts.
const permissive = computed(() => valid.value && (threshold.value as number) <= 1);
const dirty = computed(() => valid.value && threshold.value !== saved.value);
const cutoff = computed(() => (valid.value ? 1 / (threshold.value as number) : null));
const cutoffPct = computed(() => (cutoff.value === null ? null : Math.round(cutoff.value * 100)));
const exampleSpeed = computed(() => (valid.value ? (EXAMPLE_HISTORIC / (threshold.value as number)).toFixed(1) : "—"));

function step(delta: number) {
  const base = threshold.value ?? 2;
  threshold.value = Math.max(0.1, Math.round((base + delta) * 10) / 10);
}

function load() {
  loading.value = true;
  loadError.value = false;
  ThresholdAPI.get()
    .then((result) => {
      const rs = result.data.results[0];
      threshold.value = rs.threshold;
      saved.value = rs.threshold;
    })
    .catch((e) => {
      console.error(e);
      loadError.value = true;
    })
    .finally(() => {
      loading.value = false;
    });
}

function saveThreshold() {
  if (!valid.value || threshold.value === null) return;
  saving.value = true;
  ThresholdAPI.update(threshold.value)
    .then(() => {
      saved.value = threshold.value;
      ElNotification({
        title: "Umbral guardado",
        message: `Las alertas nuevas usarán el umbral ${threshold.value}.`,
        type: "success",
      });
    })
    .catch((e) => {
      ElNotification({
        title: "No se guardó el umbral",
        message: "El servidor rechazó el cambio. Revisa la conexión e inténtalo de nuevo.",
        type: "error",
      });
      console.error(e);
    })
    .finally(() => {
      saving.value = false;
    });
}

onMounted(load);
</script>

<template>
  <section class="thr tile" aria-labelledby="thr-title">
    <div class="thr-value">
      <h2 id="thr-title" class="caps">Umbral de alerta</h2>

      <div v-if="loading" class="skeleton thr-skel" />
      <div v-else-if="loadError" class="thr-error">
        <p>No se pudo leer el umbral actual.</p>
        <button type="button" class="btn" @click="load">Reintentar</button>
      </div>
      <div v-else class="thr-input-row">
        <button
          type="button"
          class="btn btn--icon"
          aria-label="Bajar umbral 0,1"
          :disabled="saving || (threshold ?? 0) <= 0.1"
          @click="step(-0.1)"
        >
          <span class="material-icons" aria-hidden="true">remove</span>
        </button>
        <label class="visually-hidden" for="thr-input">Umbral</label>
        <input
          id="thr-input"
          v-model.number="threshold"
          class="thr-input num"
          type="number"
          min="0.1"
          step="0.1"
          inputmode="decimal"
          :aria-invalid="!valid"
          @keydown.enter="saveThreshold"
        />
        <button type="button" class="btn btn--icon" aria-label="Subir umbral 0,1" :disabled="saving" @click="step(0.1)">
          <span class="material-icons" aria-hidden="true">add</span>
        </button>
      </div>
      <p v-if="!loading && !loadError && !valid" class="thr-invalid">Ingresa un número mayor que 0.</p>
      <p v-else-if="permissive" class="thr-invalid">
        Con un umbral de 1 o menos, cualquier segmento bajo su histórico genera alerta.
      </p>

      <div class="thr-actions">
        <button type="button" class="btn btn--primary" :disabled="!dirty || saving" @click="saveThreshold">
          <span class="material-icons" :class="{ spin: saving }" aria-hidden="true">
            {{ saving ? "progress_activity" : "check" }}
          </span>
          {{ saving ? "Guardando" : "Guardar cambios" }}
        </button>
        <span v-if="saved !== null" class="thr-saved caps num"> Guardado: {{ saved }} </span>
      </div>
    </div>

    <div class="thr-explain">
      <p class="thr-formula num">
        <span class="caps">Alerta si</span>
        velocidad &lt; histórico ÷ <b>{{ valid ? threshold : "—" }}</b>
      </p>

      <div class="thr-scale" aria-hidden="true">
        <div class="thr-track">
          <span v-if="cutoff !== null" class="thr-zone" :style="{ width: `${Math.min(1, cutoff / SPAN) * 100}%` }" />
          <span class="thr-ref" :style="{ left: `${(1 / SPAN) * 100}%` }" />
          <span v-if="cutoff !== null" class="thr-cut" :style="{ left: `${Math.min(1, cutoff / SPAN) * 100}%` }" />
        </div>
        <div class="thr-ticks caps num">
          <span style="left: 0">0%</span>
          <span
            v-if="cutoffPct !== null"
            class="thr-tick-cut"
            :style="{ left: `${Math.min(1, (cutoff ?? 0) / SPAN) * 100}%` }"
          >
            {{ cutoffPct }}%
          </span>
          <span :style="{ left: `${(1 / SPAN) * 100}%` }">100% histórico</span>
          <span style="left: 100%">150%</span>
        </div>
      </div>

      <p class="thr-note">
        Con este umbral, un segmento entra en alerta cuando va a menos del
        <b class="num">{{ cutoffPct ?? "—" }}%</b> de su velocidad histórica para el mismo tipo de día e intervalo.
        <span class="caps thr-eg">Ejemplo</span> con un histórico de {{ EXAMPLE_HISTORIC }} km/h, la alerta se activa
        bajo <b class="num">{{ exampleSpeed }} km/h</b>.
      </p>
      <p class="thr-note thr-note--muted">
        Subir el umbral hace las alertas más exigentes (menos y más graves); bajarlo las hace más sensibles.
      </p>
    </div>
  </section>
</template>

<style scoped>
.thr {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr);
  gap: 0;
}
.thr-value {
  padding: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  border-right: 1px solid var(--rule);
}
.thr-value h2 {
  margin: 0;
}
.thr-input-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
.thr-input {
  width: 100%;
  min-width: 0;
  flex: 1;
  height: 88px;
  padding: 0 var(--s-3);
  font-size: 4rem;
  letter-spacing: -0.04em;
  text-align: center;
  background: transparent;
  border: 0;
  border-bottom: 2px solid var(--rule-strong);
  color: var(--ink);
  -moz-appearance: textfield;
  appearance: textfield;
}
.thr-input::-webkit-outer-spin-button,
.thr-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.thr-input:focus-visible {
  outline: none;
  border-bottom-color: var(--now-line);
}
.thr-input[aria-invalid="true"] {
  border-bottom-color: var(--severe-ink);
}
.thr-invalid {
  margin: 0;
  color: var(--severe-ink);
  font-size: var(--t-small);
}
.thr-actions {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  flex-wrap: wrap;
  margin-top: auto;
}
.thr-saved {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.thr-skel {
  height: 88px;
}
.thr-error p {
  margin: 0 0 var(--s-3);
  color: var(--ink-2);
}

.thr-explain {
  padding: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.thr-formula {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  flex-wrap: wrap;
}
.thr-formula .caps {
  color: var(--ink-3);
}
.thr-formula b {
  color: var(--now-line);
  font-weight: 600;
}
.thr-scale {
  padding: var(--s-2) 0 var(--s-6);
}
.thr-track {
  position: relative;
  height: 28px;
  background: var(--nodata);
}
.thr-zone {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--severe);
}
.thr-ref {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 2px;
  background: var(--ink);
}
.thr-cut {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 2px;
  background: var(--now-line);
}
.thr-ticks {
  position: relative;
  height: 18px;
  margin-top: 8px;
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.thr-ticks span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
.thr-ticks span:first-child {
  transform: none;
}
.thr-ticks span:last-child {
  transform: translateX(-100%);
}
.thr-tick-cut {
  color: var(--now-line);
}
.thr-note {
  margin: 0;
  max-width: 68ch;
  font-size: var(--t-body);
  color: var(--ink-2);
}
.thr-note b {
  color: var(--ink);
  font-weight: 600;
}
.thr-note--muted {
  color: var(--ink-3);
  font-size: var(--t-small);
}
.thr-eg {
  color: var(--ink-3);
  font-size: var(--t-micro);
  margin: 0 4px;
}

@media (max-width: 860px) {
  .thr {
    grid-template-columns: 1fr;
  }
  .thr-value {
    border-right: 0;
    border-bottom: 1px solid var(--rule);
  }
}
</style>
