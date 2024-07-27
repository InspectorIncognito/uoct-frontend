<script setup lang="ts">
import { onMounted, ref } from "vue";
import SpeedAPI from "@/components/api/SpeedAPI";
import { getDayType, getDayTypeIndex } from "@/utils/date_utils";

const TEMPORAL_RANGE = 15;

function parseTemporalSegment(idx: number) {
  if (!idx && idx !== 0) return "";
  const startTime = idx * TEMPORAL_RANGE;
  const endTime = startTime + TEMPORAL_RANGE;

  const startHours = Math.floor(startTime / 60);
  const endHours = Math.floor(endTime / 60);
  const startMinutes = startTime % 60;
  const endMinutes = endTime % 60;

  const formatTime = (hours: number, minutes: number) => {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const start = formatTime(startHours, startMinutes);
  const end = formatTime(endHours, endMinutes);

  return `${start} - ${end}`;
}

interface HistoricSpeed {
  shape: number;
  sequence: number;
  temporal_segment: number;
  day_type: string;
  speed: number;
}

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const month_string = currentDate.toLocaleString("default", { month: "long" });

const monthOptions = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];
const monthValue = ref(monthOptions[currentMonth - 1].value);
const dayTypeOptions = [
  { value: "L", label: "Laboral" },
  { value: "S", label: "Sábado" },
  { value: "D", label: "Domingo" },
  { value: false, label: "Todos" },
];
const dayTypeValue = ref(dayTypeOptions[dayTypeOptions.length - 1].value);

const lastMonth = ref();
const lastDayType = ref();

const loading = ref(false);

const tableData = ref<HistoricSpeed[]>();

function downloadHistoricSpeeds(month: number, dayType: string | boolean) {
  SpeedAPI.downloadHistoricSpeeds(month, dayType).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `historic_speed_${month_string}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  });
}

onMounted(() => {
  updateHistoricSpeedData(currentMonth, false);
});

function updateHistoricSpeedData(month: number, dayType: string | boolean) {
  if (lastMonth.value === month && lastDayType.value === dayType) {
    return;
  }

  loading.value = true;
  SpeedAPI.getHistoricSpeeds(month, dayType)
    .then((response) => {
      response.data.results.forEach((obj) => {
        obj.temporal_segment = parseTemporalSegment(obj.temporal_segment);
      });
      tableData.value = response.data.results;
    })
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      loading.value = false;
    });
  lastMonth.value = month;
  lastDayType.value = dayType;
}
function test(month: number, dayType: string | boolean) {
  console.log("passed month:", month);
  console.log("passed daytype", dayType);
  console.log(" ");
  console.log("last month:", lastMonth.value);
  console.log("last daytype:", lastDayType.value);
  lastMonth.value = month;
  lastDayType.value = dayType;
}
</script>

<template>
  <div class="table-view">
    <div class="table-container">
      <div class="table-buttons-container">
        <div class="options-section">
          <div class="option-container">
            <span>Mes</span>
            <el-select v-model="monthValue" placeholder="Select" style="width: 240px">
              <el-option v-for="item in monthOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="option-container">
            <span>Tipo de día</span>
            <el-select v-model="dayTypeValue" placeholder="Select" style="width: 240px">
              <el-option v-for="item in dayTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
        </div>

        <el-button @click="updateHistoricSpeedData(monthValue, dayTypeValue)">Aplicar filtros</el-button>
      </div>
      <el-table
        v-loading="loading"
        class="historic-speed-table"
        ref="tableRef"
        row-key="date"
        :data="tableData"
        style="width: 60vw; height: 50vh"
      >
        <el-table-column fixed sortable prop="shape" label="Shape" column-key="Shape" />
        <el-table-column sortable prop="sequence" label="Sequence" />
        <el-table-column sortable prop="temporal_segment" label="Temporal Segment" />
        <el-table-column sortable prop="day_type" label="Day Type" />
        <el-table-column sortable prop="speed" label="Speed" />
      </el-table>
    </div>
    <div class="download-container">
      <div class="download-button" @click="downloadHistoricSpeeds(monthValue, dayTypeValue)">
        <div class="download-label">Descargar</div>
        <span class="material-icons">download</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.options-section {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.option-container {
  display: flex;
  flex-direction: column;
  justify-content: left;
}
.table-buttons-container {
  display: flex;
  flex-direction: row;
  width: 60vw;
  color: white;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 8px;
}

.download-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-direction: row;
  padding: 8px 8px;
}

.download-label {
  color: white;
  font-size: 16px;
  letter-spacing: 1px;
}

.download-button {
  background: #31304d;
  border-radius: 8px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  min-width: min-content;
  text-transform: uppercase;
  font-family: Roboto, serif;
  font-weight: 600;
  user-select: none;
  padding: 8px;
  cursor: pointer;
  border: 1px solid white;
}

.download-button span {
  font-size: 24px;
  color: white;
}

.table-view {
  display: flex;
  flex-direction: column;
  background: #343332;
  height: 100%;
  width: 100%;
}

.table-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.historic-speed-table {
  border-radius: 8px;
}
</style>
