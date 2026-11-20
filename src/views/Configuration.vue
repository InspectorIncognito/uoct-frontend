<script setup lang="ts">
import ThresholdConfiguration from "@/components/ThresholdConfiguration.vue";
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Umbral de alertas</h1>
        <p>
          Define qué tan lejos de su histórico debe caer la velocidad de un segmento para generar una alerta de
          congestión.
        </p>
      </div>
    </header>
    <ThresholdConfiguration />
  </div>
</template>
