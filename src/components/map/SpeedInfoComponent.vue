<script setup lang="ts">
import SideInfoComponent from "@/components/map/SideInfoComponent.vue";
import ColorComponent from "@/components/map/ColorComponent.vue";

interface ColorData {
  color: string;
  info: string;
}

defineProps<{ colorData: ColorData[]; top: number }>();
</script>

<template>
  <SideInfoComponent :top="top">
    <div class="speed-data" v-for="(obj, idx) in colorData" :key="idx">
      <ColorComponent :color="obj.color" />
      <div class="speed-label">{{ obj.info }}</div>
    </div>
  </SideInfoComponent>
</template>

<style scoped>
.speed-data {
  display: flex;
  flex-direction: row;
  padding-left: 16px;
  justify-content: center;
  align-items: center;
  gap: 16px;
  text-align: right;
}
.speed-label {
  width: 180px;
}
</style>
