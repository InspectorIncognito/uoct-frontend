<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import MapAPI from "@/components/api/MapAPI";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { formatClock, intervalLabel, scheduleRefresh, useLiveStore } from "@/stores/live";
import { TEMPORAL_MS } from "@/utils/date_utils";
import { FORM_URL } from "@/config";

const authStore = useAuthStore();
const themeStore = useThemeStore();
const live = useLiveStore();
const router = useRouter();
const route = useRoute();
const tabsEl = ref<HTMLElement>();

// Mapa and Panel refresh the live data themselves; on the other screens the
// shell checks the feed so "Actualizado" always reflects a real reading.
const LIVE_ROUTES = new Set(["map", "dashboard"]);
async function pollFeed() {
  if (LIVE_ROUTES.has(String(route.name))) return;
  const last = live.lastUpdate?.getTime() ?? 0;
  if (Date.now() - last < TEMPORAL_MS) return;
  try {
    await MapAPI.getMapData();
    live.markUpdated(new Date());
  } catch {
    // Leave the last good reading in place.
  }
}
let stopRefresh: (() => void) | null = null;

function revealActiveTab() {
  nextTick(() => {
    tabsEl.value?.querySelector<HTMLElement>(".is-active")?.scrollIntoView({ block: "nearest", inline: "center" });
  });
}
watch(
  () => route.name,
  () => {
    revealActiveTab();
    pollFeed();
  }
);

const tabs = [
  { to: "/map", label: "Mapa" },
  { to: "/dashboard", label: "Panel" },
  { to: "/speeds", label: "Velocidades" },
  { to: "/historicSpeeds", label: "Mensual" },
  { to: "/configuration", label: "Umbral" },
  { to: "/place-streets", label: "Ejes" },
];

const elapsed = computed(() => {
  // Fraction of the current temporal interval already elapsed.
  const next = live.nextRefresh.getTime();
  const remaining = Math.max(0, next - live.now.getTime());
  return Math.min(1, Math.max(0, 1 - remaining / TEMPORAL_MS));
});

const signOut = () => {
  authStore.purgeAuth();
  router.push({ name: "login" });
};

onMounted(() => {
  live.start();
  pollFeed();
  revealActiveTab();
  stopRefresh = scheduleRefresh(() => pollFeed());
});
onUnmounted(() => {
  live.stop();
  stopRefresh?.();
  stopRefresh = null;
});
</script>

<template>
  <header class="bar">
    <RouterLink to="/map" class="brand" aria-label="UOCT, ir al mapa">
      <svg class="brand-mark" viewBox="0 0 18 18" aria-hidden="true">
        <rect x="0" y="0" width="5" height="5" class="m-cell" />
        <rect x="6.5" y="0" width="5" height="5" class="m-cell" />
        <rect x="13" y="0" width="5" height="5" class="m-hot" />
        <rect x="0" y="6.5" width="5" height="5" class="m-cell" />
        <rect x="6.5" y="6.5" width="5" height="5" class="m-hot" />
        <rect x="13" y="6.5" width="5" height="5" class="m-cell" />
        <rect x="0" y="13" width="5" height="5" class="m-hot" />
        <rect x="6.5" y="13" width="5" height="5" class="m-cell" />
        <rect x="13" y="13" width="5" height="5" class="m-cell" />
      </svg>
      <span class="brand-name">UOCT</span>
      <span class="brand-sub caps">Velocidad de buses</span>
    </RouterLink>

    <nav ref="tabsEl" class="tabs" aria-label="Secciones">
      <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab caps" active-class="is-active">
        {{ tab.label }}
      </RouterLink>
      <a v-if="FORM_URL" :href="FORM_URL" target="_blank" rel="noopener noreferrer" class="tab caps">
        Alertas
        <span class="material-icons tab-ext" aria-hidden="true">north_east</span>
        <span class="visually-hidden">(formulario externo)</span>
      </a>
    </nav>

    <dl class="readings" aria-live="off">
      <div class="reading">
        <dt class="caps">Intervalo</dt>
        <dd class="num">{{ intervalLabel(live.intervalIndex) }}</dd>
      </div>
      <div class="reading reading--updated">
        <dt class="caps">Actualizado</dt>
        <dd class="num">{{ formatClock(live.lastUpdate, true) }}</dd>
      </div>
      <div class="reading">
        <dt class="caps">Próxima</dt>
        <dd class="num">
          {{ live.countdown }}
          <span class="elapsed" aria-hidden="true">
            <span class="elapsed-fill" :style="{ transform: `scaleX(${elapsed})` }" />
          </span>
        </dd>
      </div>
    </dl>

    <div class="actions">
      <button
        type="button"
        class="btn btn--icon"
        :aria-label="themeStore.theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
        :title="themeStore.theme === 'dark' ? 'Tema claro' : 'Tema oscuro'"
        @click="themeStore.toggle()"
      >
        <span class="material-icons" aria-hidden="true">
          {{ themeStore.theme === "dark" ? "light_mode" : "dark_mode" }}
        </span>
      </button>
      <button type="button" class="btn btn--icon" aria-label="Cerrar sesión" title="Cerrar sesión" @click="signOut">
        <span class="material-icons" aria-hidden="true">logout</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  gap: var(--s-6);
  height: var(--bar-h);
  padding: 0 var(--s-4);
  background: var(--ground);
  border-bottom: 1px solid var(--rule-strong);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  text-decoration: none;
  color: var(--ink);
  padding-right: var(--s-6);
  border-right: 1px solid var(--rule);
  flex-shrink: 0;
}
.brand-mark {
  width: 18px;
  height: 18px;
}
.m-cell {
  fill: var(--rule-strong);
}
.m-hot {
  fill: var(--now);
}
.brand-name {
  font-size: var(--t-title);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.brand-sub {
  color: var(--ink-3);
}

.tabs {
  display: flex;
  align-items: stretch;
  gap: var(--s-1);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar {
  display: none;
}
.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  padding: 0 var(--s-3);
  color: var(--ink-3);
  text-decoration: none;
  white-space: nowrap;
  transition: color var(--dur) var(--ease-out);
}
.tab::after {
  content: "";
  position: absolute;
  left: var(--s-3);
  right: var(--s-3);
  bottom: -1px;
  height: 2px;
  background: var(--now);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur) var(--ease-out);
}
.tab:hover {
  color: var(--ink);
}
.tab.is-active {
  color: var(--ink);
}
.tab.is-active::after {
  transform: scaleX(1);
}
.tab-ext {
  font-size: 14px;
}

.readings {
  display: flex;
  align-items: center;
  gap: var(--s-6);
  margin: 0 0 0 auto;
  padding-left: var(--s-6);
  border-left: 1px solid var(--rule);
}
.reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reading dt {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.reading dd {
  margin: 0;
  font-size: var(--t-small);
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: var(--s-2);
}
.elapsed {
  width: 36px;
  height: 2px;
  background: var(--rule-strong);
  overflow: hidden;
}
.elapsed-fill {
  display: block;
  height: 100%;
  background: var(--now);
  transform-origin: left;
  transition: transform 1s linear;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding-left: var(--s-4);
  border-left: 1px solid var(--rule);
}
.actions .btn {
  border-color: transparent;
  color: var(--ink-2);
}
.actions .btn:hover {
  border-color: var(--rule-strong);
  color: var(--ink);
}

@media (max-width: 1320px) {
  .brand-sub {
    display: none;
  }
}
@media (max-width: 1180px) {
  .reading--updated {
    display: none;
  }
}
@media (max-width: 720px) {
  .bar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      "brand readings actions"
      "tabs tabs tabs";
    grid-template-rows: 48px 48px;
    gap: 0 var(--s-3);
    height: var(--bar-h);
    padding: 0 var(--s-2);
  }
  .brand {
    grid-area: brand;
    padding-right: var(--s-3);
  }
  .readings {
    grid-area: readings;
    margin: 0;
    padding-left: var(--s-3);
    gap: var(--s-4);
  }
  .actions {
    grid-area: actions;
    padding-left: var(--s-2);
    gap: 0;
  }
  .tabs {
    grid-area: tabs;
    border-top: 1px solid var(--rule);
    margin: 0 calc(-1 * var(--s-2));
    padding: 0 var(--s-2);
    /* Fade the trailing edge so it is clear the row scrolls. */
    -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
    mask-image: linear-gradient(90deg, #000 85%, transparent);
  }
  .tab {
    padding: 0 var(--s-2);
  }
  .tab::after {
    left: var(--s-2);
    right: var(--s-2);
  }
}
</style>
