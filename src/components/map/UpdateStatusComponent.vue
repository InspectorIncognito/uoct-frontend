<script setup lang="ts">
import { ref } from "vue";
import SideInfoComponent from "@/components/map/SideInfoComponent.vue";

defineProps({
  date: Date,
  top: Number,
  content: Object,
});

const show = ref(true);

function toggleShow() {
  show.value = !show.value;
}

function getTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
</script>

<template>
  <SideInfoComponent :top="top"
    ><div class="update-message" v-for="(elem, idx) of content" :key="idx">{{ elem }}</div></SideInfoComponent
  >
</template>

<style scoped>
.update-message {
  padding-left: 16px;
}
</style>
