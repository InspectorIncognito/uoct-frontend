<script setup lang="ts">
import { onMounted, ref } from "vue";

defineProps({
  date: Date,
  top: Number,
  content: Object,
});

const show = ref(true);

function toggleShow() {
  show.value = !show.value;
}

onMounted(() => {
  setTimeout(() => {
    show.value = false;
  }, 5000);
});
</script>

<template>
  <div class="update-status-container" :style="`top: ${top}vh;`" :class="show ? 'show' : 'hide'">
    <span class="material-icons update-status-button" @click="toggleShow">
      {{ show ? "chevron_right" : "chevron_left" }}
    </span>
    <div class="update-status">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
@keyframes slideIn {
  0% {
    right: -25vw; /* Offscreen */
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
    right: -25vw; /* Offscreen */
  }
}
.update-status-container {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  z-index: 100;
  min-height: 64px;
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.6);
}
.update-status-container.show {
  right: 0;
  animation: slideIn 0.5s forwards;
}
.update-status-container.hide {
  right: -25vw;
  animation: slideOut 0.5s forwards;
}

.update-status {
  user-select: none;
  color: white;
  background: #31304d;
  font-family: Inter, serif;
  font-size: 1.2vw;
  min-height: 6vh;
  width: 25vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
}
.update-status-button {
  font-size: 2vw;
  cursor: pointer;
  user-select: none;
  color: white;
}
</style>
