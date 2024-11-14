<script setup lang="ts">
import ThresholdConfiguration from "@/components/ThresholdConfiguration.vue";
</script>

<template>
  <div class="configuration-frame">
    <div class="configuration-box">
      <div class="configuration-header">
        <div class="title">Configuración de Alertas</div>
      </div>
      <ThresholdConfiguration name="Configuración de Alertas" />
    </div>
  </div>
</template>

<style scoped>
.title {
  color: white;
}

.configuration-frame {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #161a30;
  justify-content: center;
  align-items: center;
}

.configuration-header {
  display: flex;
  height: 10vh;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.configuration-box {
  display: flex;
  flex-direction: column;
  width: 50vw;
  height: 50vh;
  align-items: center;
}
</style>
