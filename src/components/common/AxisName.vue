<script setup lang="ts">
import { computed } from "vue";

// Renders "Alameda · S1" so that only the street part truncates: the sentido
// is the one piece that tells both directions of an axis apart.
const props = defineProps<{ name: string }>();
const parts = computed(() => {
  const m = props.name.match(/^(.*) · sentido (\d+)$/);
  return m ? { street: m[1], dir: `S${m[2]}` } : { street: props.name, dir: "" };
});
</script>

<template>
  <span class="axis-name" :title="name">
    <span class="axis-street">{{ parts.street }}</span>
    <span v-if="parts.dir" class="axis-dir">&nbsp;· {{ parts.dir }}</span>
  </span>
</template>

<style scoped>
.axis-name {
  display: flex;
  min-width: 0;
  white-space: nowrap;
}
.axis-street {
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.axis-dir {
  flex-shrink: 0;
}
</style>
