<script setup lang="ts">
import { ref } from "vue";

defineProps({
  date: Date,
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
  <div class="update-status-container" :class="show ? 'show' : 'hide'">
    <span class="material-icons update-status-button" @click="toggleShow">
      {{ show ? "chevron_right" : "chevron_left" }}</span
    >
    <div class="update-status">
      <div>Mapa actualizado a las {{ getTime(date) }}</div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn {
  0% {
    right: -400px; /* Offscreen */
  }
  100% {
    right: 0; /* Final position */
  }
}

@keyframes slideOut {
  0% {
    right: 0; /* Final position */
  }
  100% {
    right: -400px; /* Offscreen */
  }
}
.update-status-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 128px;
  z-index: 100;
  height: 80px;
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.6);
}
.update-status-container.show {
  right: 0;
  animation: slideIn 0.5s forwards;
}
.update-status-container.hide {
  right: -400px;
  animation: slideOut 0.5s forwards;
}

.update-status {
  user-select: none;
  color: white;
  background: #31304d;
  font-family: Inter, serif;
  font-size: 24px;
  height: 80px;
  width: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.update-status-button {
  font-size: 36px;
  cursor: pointer;
  user-select: none;
  color: white;
}
</style>
