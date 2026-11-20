<template>
  <div class="login">
    <LoginCard />
    <div class="login-ruler" aria-hidden="true">
      <span v-for="h in 9" :key="h" class="tick num" :style="{ left: `${(((h - 1) * 3) / 24) * 100}%` }">
        {{ String((h - 1) * 3).padStart(2, "0") }}
      </span>
      <span class="now" :style="{ left: `${nowShare * 100}%` }">
        <span class="now-label num">{{ nowLabel }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginCard from "@/components/LoginCard.vue";
import { formatClock } from "@/stores/live";

const now = new Date();
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Santiago",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).formatToParts(now);
const hh = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
const mm = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
const nowShare = (hh * 60 + mm) / 1440;
const nowLabel = formatClock(now);
</script>

<style scoped>
.login {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--s-6) var(--s-4) 96px;
}
.login-ruler {
  position: absolute;
  left: var(--s-8);
  right: var(--s-8);
  bottom: var(--s-8);
  height: 24px;
  border-top: 1px solid var(--rule-strong);
  background-image: linear-gradient(90deg, var(--rule-strong) 1px, transparent 1px);
  background-size: calc(100% / 24) 6px;
  background-repeat: repeat-x;
}
.tick {
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  font-size: var(--t-micro);
  color: var(--ink-3);
}
.tick:first-child {
  transform: none;
}
.now {
  position: absolute;
  top: -12px;
  width: 2px;
  height: 18px;
  background: var(--now-line);
}
.now-label {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1px 6px;
  background: var(--now);
  color: var(--on-now);
  font-size: var(--t-micro);
}
</style>
