<script setup lang="ts">
import { temporalSegmentFromUTCIndex } from "@/utils/date_utils";
import { computed } from "vue";

const props = defineProps({
  keyValue: String,
  useful: Number,
  useless: Number,
});

const TEMPORAL_RANGE = 15;
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
      adjustedDayType =
        DAY_ORDER[(dayIdx - 1 + DAY_ORDER.length) % DAY_ORDER.length];
    } else if (rawOffset > 0 && utcMinutes >= 1440 - rawOffset) {
      // Crossed forward to the next day
      adjustedDayType = DAY_ORDER[(dayIdx + 1) % DAY_ORDER.length];
    }
  }

  // Reconstruct the key value with adjusted day type and local temporal segment
  return `${shape}|${sequence}|${adjustedDayType}|${localIndex}|${speed}`;
});
</script>

<template>
  <div class="segment-popup">
    <div class="header">Alerta de congestión</div>
    <div class="section-container">
      <div class="section">
        <div class="section-icons">
          <span class="material-icons">info</span>
        </div>
        <div class="section-data">{{ displayKeyValue }}</div>
      </div>
      <div class="metrics-container">
        <div class="metric">
          <span class="material-icons">thumb_up</span>
          <span>{{ useful }}</span>
        </div>

        <div class="metric">
          <span class="material-icons">thumb_down</span>
          <span>{{ useless }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
