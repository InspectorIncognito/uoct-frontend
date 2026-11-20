<script setup lang="ts">
import { TEMPORAL_RANGE, temporalSegmentFromUTCIndex } from "@/utils/date_utils";
import { computed } from "vue";
import { intervalLabel } from "@/stores/live";

const props = defineProps({
  keyValue: String,
  /** Axis name when the shape names are loaded. */
  name: {
    type: String,
    default: "",
  },
  useful: Number,
  useless: Number,
  /** Distinct buses behind the alerted speed (null when the segment has no reading). */
  volume: {
    type: Number,
    default: null,
  },
});

const DAY_ORDER = ["L", "S", "D"];

const displayKeyValue = computed(() => {
  if (!props.keyValue) return "";

  // keyValue format: shape|sequence|day_type|temporal_segment|speed
  const parts = props.keyValue.split("|");
  if (parts.length !== 5) return props.keyValue;

  const [shape, sequence, dayType, utcTemporalSegment, speed] = parts;

  const utcIndex = parseInt(utcTemporalSegment, 10);
  if (isNaN(utcIndex)) return props.keyValue;

  const referenceDate = new Date();
  const localIndex = temporalSegmentFromUTCIndex(utcIndex, referenceDate);

  // Determine if we crossed a day boundary when converting UTC → Santiago.
  const utcMinutes = utcIndex * TEMPORAL_RANGE;
  const localMinutes = localIndex * TEMPORAL_RANGE;
  // Compute the signed offset (minutes), clamped to (-720, 720]
  let rawOffset = localMinutes - utcMinutes;
  if (rawOffset > 720) rawOffset -= 1440;
  if (rawOffset <= -720) rawOffset += 1440;

  let adjustedDayType = dayType;
  const dayIdx = DAY_ORDER.indexOf(dayType);
  if (dayIdx !== -1) {
    if (rawOffset < 0 && utcMinutes < Math.abs(rawOffset)) {
      // Crossed back to the previous day
      adjustedDayType = DAY_ORDER[(dayIdx - 1 + DAY_ORDER.length) % DAY_ORDER.length];
    } else if (rawOffset > 0 && utcMinutes >= 1440 - rawOffset) {
      // Crossed forward to the next day
      adjustedDayType = DAY_ORDER[(dayIdx + 1) % DAY_ORDER.length];
    }
  }

  // Reconstruct the key value with adjusted day type and local temporal segment
  return `${shape}|${sequence}|${adjustedDayType}|${localIndex}|${speed}`;
});

const DAY_LABEL: Record<string, string> = { L: "Laboral", S: "Sábado", D: "Domingo" };

// Parsed view of displayKeyValue: shape|sequence|day_type|local_segment|speed
const parts = computed(() => {
  const p = displayKeyValue.value.split("|");
  if (p.length !== 5) return null;
  const idx = Number(p[3]);
  return {
    shape: p[0],
    sequence: p[1].padStart(2, "0"),
    dayType: DAY_LABEL[p[2]] ?? p[2],
    interval: Number.isFinite(idx) ? intervalLabel(idx) : p[3],
    speed: Number(p[4]),
  };
});
const votes = computed(() => (props.useful ?? 0) + (props.useless ?? 0));
</script>

<template>
  <div class="alert-popup">
    <header class="ap-head caps">
      <span class="material-icons" aria-hidden="true">warning</span>
      Alerta de congestión
    </header>
    <div class="ap-body">
      <template v-if="parts">
        <div class="ap-where caps num">{{ name || `Shape ${parts.shape}` }} · Seg {{ parts.sequence }}</div>
        <div class="ap-speed num">
          <span class="ap-value">{{ Number.isFinite(parts.speed) ? parts.speed.toFixed(1) : "—" }}</span>
          <span class="caps">km/h</span>
        </div>
        <div class="ap-volume num">
          <span class="caps ap-k">Volumen</span>
          <span>
            <b>{{ volume ?? "—" }}</b> {{ volume === 1 ? "bus" : "buses" }}
          </span>
        </div>
        <div class="ap-meta caps num">
          <span>{{ parts.interval }}</span>
          <span>{{ parts.dayType }}</span>
        </div>
      </template>
      <div v-else class="ap-raw num">{{ displayKeyValue }}</div>

      <div class="ap-votes">
        <span class="caps ap-k">Calificación</span>
        <span class="ap-vote num">
          <span class="material-icons" aria-hidden="true">thumb_up</span>{{ useful }}
          <span class="visually-hidden">útil</span>
        </span>
        <span class="ap-vote num">
          <span class="material-icons" aria-hidden="true">thumb_down</span>{{ useless }}
          <span class="visually-hidden">no útil</span>
        </span>
        <span v-if="!votes" class="ap-none">sin votos</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-popup {
  font-family: var(--font);
  color: var(--ink);
  width: 248px;
}
.ap-head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 10px 40px 10px var(--s-4);
  background: var(--severe);
  color: var(--on-severe);
}
.ap-head .material-icons {
  font-size: 16px;
}
.ap-body {
  padding: var(--s-3) var(--s-4) var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.ap-where {
  color: var(--ink-2);
}
.ap-speed {
  display: flex;
  align-items: baseline;
  gap: var(--s-2);
}
.ap-value {
  font-size: var(--t-num-m);
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--severe-ink);
}
.ap-volume {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--t-small);
}
.ap-volume b {
  font-size: var(--t-title);
  font-weight: 500;
}
.ap-meta {
  display: flex;
  justify-content: space-between;
  color: var(--ink-3);
  font-size: var(--t-micro);
}
.ap-raw {
  font-size: var(--t-small);
  word-break: break-all;
}
.ap-votes {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding-top: var(--s-2);
  border-top: 1px solid var(--rule);
  font-size: var(--t-small);
}
.ap-k {
  color: var(--ink-3);
  font-size: var(--t-micro);
  margin-right: auto;
}
.ap-vote {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ap-vote .material-icons {
  font-size: 15px;
}
.ap-none {
  color: var(--ink-3);
  font-size: var(--t-micro);
}
</style>
