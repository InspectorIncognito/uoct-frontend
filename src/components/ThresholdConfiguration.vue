<script setup lang="ts">
import { onMounted, ref } from "vue";
import ThresholdAPI from "@/components/api/ThresholdAPI";
import { ElNotification } from "element-plus";

const threshold = ref();
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

onMounted(() => {
  ThresholdAPI.get().then((result) => {
    const rs = result.data.results[0];
    threshold.value = rs.threshold;
  });
});
</script>

<template>
  <div class="configuration-card">
    <div class="configuration-content">
      <span class="title">Alert Threshold</span>
    </div>
    <div class="configuration-content">
      <input v-model="threshold" type="number" placeholder="Ej: 2" />
    </div>
    <div class="configuration-content">
      <span>
        Fórmula:<br />
        speed &lt historic_speed / {{ threshold }}</span
      >
    </div>
    <div class="configuration-footer">
      <button class="submit" @click="saveThreshold">Guardar Cambios</button>
    </div>
  </div>
</template>

<style scoped>
.title {
  font-family: Roboto, sans-serif;
  font-size: 24px;
  font-weight: 400;
}
.configuration-card {
  background: #f0ece5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
  width: 20vw;
}
.configuration-card .configuration-content {
  display: flex;
  justify-content: center;
  align-content: center;
}
.configuration-content input {
  padding: 8px;
  font-size: 20px;
  max-width: 64px;
  overflow-x: hidden;
  text-align: center;
  font-weight: 600;
}
.configuration-footer {
  display: flex;
  justify-content: center;
}
.configuration-footer .submit {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 0 0 rgba(0, 0, 0, 0.75);
  transition: color 0.2s ease, background 0.2s ease;
}
.configuration-footer .submit:hover {
  color: white;
  background: #31304d;
}
.configuration-footer .submit:active {
  color: white;
  background: black;
  transform: translateY(4px);
  box-shadow: none;
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
