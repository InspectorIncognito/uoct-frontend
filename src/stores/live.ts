import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { TEMPORAL_MS, temporalSegmentFromTimestamp, temporalSegmentLabel } from "@/utils/date_utils";

/** Data refreshes 75 s after each temporal-segment cut (every TEMPORAL_RANGE minutes):
 * the speed job starts 30 s after the cut and takes ~15-20 s. */
export const REFRESH_OFFSET_MS = 75 * 1000;

/** Segment cuts are aligned to UTC midnight, and 86400 s is a whole number of segments. */
function nextRefreshAfter(date: Date) {
  const t = date.getTime();
  const cut = Math.floor((t - REFRESH_OFFSET_MS) / TEMPORAL_MS) * TEMPORAL_MS + REFRESH_OFFSET_MS;
  return new Date(cut <= t ? cut + TEMPORAL_MS : cut);
}

/** Runs fn right after every segment cut. Returns a function that stops it. */
export function scheduleRefresh(fn: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const arm = () => {
    const delay = Math.max(0, nextRefreshAfter(new Date()).getTime() - Date.now());
    timer = setTimeout(() => {
      if (stopped) return;
      fn();
      arm();
    }, delay);
  };
  arm();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

export function formatClock(date: Date | null, withSeconds = false) {
  if (!date) return "--:--";
  return date.toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  });
}

export const intervalLabel = temporalSegmentLabel;

export const useLiveStore = defineStore("live", () => {
  const now = ref(new Date());
  const lastUpdate = ref<Date | null>(null);
  const refreshing = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      now.value = new Date();
    }, 1000);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function markUpdated(date = new Date()) {
    lastUpdate.value = date;
  }

  /** Local (America/Santiago) temporal-segment index, 0..191. */
  const intervalIndex = computed(() => temporalSegmentFromTimestamp(now.value));
  const nextRefresh = computed(() => nextRefreshAfter(now.value));
  const countdown = computed(() => {
    const ms = Math.max(0, nextRefresh.value.getTime() - now.value.getTime());
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  });

  return {
    now,
    lastUpdate,
    refreshing,
    intervalIndex,
    nextRefresh,
    countdown,
    start,
    stop,
    markUpdated,
  };
});
