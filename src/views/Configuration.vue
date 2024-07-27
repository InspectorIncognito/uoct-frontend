<script setup lang="ts">
import { onMounted, ref } from "vue";
import ThresholdAPI from "@/components/api/ThresholdAPI";
import { ElNotification } from "element-plus";

const threshold = ref();

onMounted(() => {
  ThresholdAPI.get().then((result) => {
    const rs = result.data.results[0];
    threshold.value = rs.threshold;
  });
});

function saveThreshold() {
  ThresholdAPI.update(threshold.value)
    .then(() => {
      ElNotification({
        title: "Éxito",
        message: "Valor actualizado",
        type: "success",
      });
    })
    .catch((e) => {
      ElNotification({
        title: "Error",
        message: "Error al actualizar",
        type: "error",
      });
      console.error(e);
    });
}
</script>

<template>
  <div class="configuration-frame">
    <div class="configuration-box">
      <div class="configuration-header">
        <div class="title">Configuración</div>
      </div>

      <div class="threshold-container">
        <span>Alert Threshold</span>
        <el-input v-model="threshold" class="threshold-input" />
        <el-button @click="saveThreshold">Actualizar</el-button>
        <span>Fórmula: {{ threshold }} * speed &lt; historic_speed</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title {
  color: white;
}
.threshold-input {
  width: 80px;
}

.configuration-frame {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #343332;
  justify-content: center;
  align-items: center;
}
.threshold-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  color: white;
  width: 100%;
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
  background: #31304d;
  align-items: center;
}
</style>
