<script setup lang="ts">
import { ref } from "vue";
import SideInfoComponent from "@/components/map/SideInfoComponent.vue";

defineProps({
  date: Date,
  top: Number,
  content: Object,
});

const show = ref(true);
</script>

<template>
  <SideInfoComponent :top="top">
    <div class="update-message" v-for="(elem, idx) of content" :key="idx">{{ elem }}</div>
  </SideInfoComponent>
</template>

<style scoped>
.update-message {
  padding-left: 16px;
}
</style>
