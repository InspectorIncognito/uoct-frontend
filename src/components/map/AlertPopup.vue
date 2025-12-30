<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  keyValue: String,
  useful: Number,
  useless: Number,
});

const displayKeyValue = computed(() => {
  if (!props.keyValue) return "";

  // keyValue format: shape|sequence|day_type|temporal_segment|speed
  const parts = props.keyValue.split("|");
  if (parts.length !== 5) return props.keyValue;

  const [shape, sequence, dayType, utcTemporalSegment, speed] = parts;

  // Convert UTC temporal segment index to Santiago timezone
  const utcIndex = parseInt(utcTemporalSegment, 10);
  if (isNaN(utcIndex)) return props.keyValue;

  const referenceDate = new Date();
  const TEMPORAL_RANGE = 15; // 15 minutes per segment
  const total = Math.floor(1440 / TEMPORAL_RANGE); // 96 segments per day

  // Get Santiago time zone offset in minutes
  const utcDate = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      0,
      0,
      0
    )
  );

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts2 = formatter.formatToParts(utcDate).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {} as Record<string, string>);

  const hour = Number(parts2.hour || "0");
  const minute = Number(parts2.minute || "0");
  let offsetMinutes = hour * 60 + minute;

  // Handle day wrapping
  if (offsetMinutes >= 720) offsetMinutes -= 1440;

  const offsetSegments = Math.round(offsetMinutes / TEMPORAL_RANGE);
  let localIndex = (utcIndex + offsetSegments) % total;
  if (localIndex < 0) localIndex += total;

  // Determine if the day changes when converting from UTC to Santiago
  let adjustedDayType = dayType;
  const utcMinutes = utcIndex * TEMPORAL_RANGE;

  // Calculate if we crossed midnight (day boundary)
  if (offsetMinutes < 0 && utcMinutes < Math.abs(offsetMinutes)) {
    // We crossed back to the previous day
    const dayOrder = ["L", "S", "D"];
    const currentIdx = dayOrder.indexOf(dayType);
    if (currentIdx !== -1) {
      const prevIdx = (currentIdx - 1 + dayOrder.length) % dayOrder.length;
      adjustedDayType = dayOrder[prevIdx];
    }
  } else if (offsetMinutes > 0 && utcMinutes >= 1440 - offsetMinutes) {
    // We crossed forward to the next day
    const dayOrder = ["L", "S", "D"];
    const currentIdx = dayOrder.indexOf(dayType);
    if (currentIdx !== -1) {
      const nextIdx = (currentIdx + 1) % dayOrder.length;
      adjustedDayType = dayOrder[nextIdx];
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
