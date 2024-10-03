<script setup lang="ts">
import { onMounted, ref } from "vue";
import SpeedAPI from "@/components/api/SpeedAPI";
import { parseTemporalSegment, monthOptions, dayTypeOptions, temporalSegmentRange } from "@/utils/date_utils";

interface Speed {
  shape: number;
  sequence: number;
  temporalSegment: number;
  dayType: string;
  distance: number;
  timeSecs: number;
  timestamp: number;
}

const today = new Date();
const dateTimeValue = ref([
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
]);

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const monthString = currentDate.toLocaleString("default", { month: "long" });

const dayTypeValue = ref(dayTypeOptions[dayTypeOptions.length - 1].value);

const temporalSegmentOptions: Array<{ label: string; value: number }> = Array.from(
  { length: temporalSegmentRange },
  (_, t) => ({ label: parseTemporalSegment(t), value: t })
);
temporalSegmentOptions.unshift({ label: "Todos", value: -1 });
const selectedTemporalSegment = ref(-1);

const lastDayType = ref();
const loading = ref(false);

const tableData = ref<Speed[]>();
const totalCount = ref<number>(0);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);

function downloadSpeeds(dayType: string | boolean, temporalSegment: number) {
  const startTime = new Date(dateTimeValue.value[0]);
  const endTime = new Date(dateTimeValue.value[1]);
  SpeedAPI.downloadSpeeds(startTime, endTime, dayType, temporalSegment).then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `speed_${monthString}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  });
}

function updateSpeedData(dayType: string | boolean, temporalSegment = -1, usePage = true) {
  loading.value = true;
  if (!usePage) {
    currentPage.value = 1;
  }
  const startTime = new Date(dateTimeValue.value[0]);
  const endTime = new Date(dateTimeValue.value[1]);
  const page = currentPage.value;
  SpeedAPI.getSpeeds(startTime, endTime, dayType, temporalSegment, page)
    .then((response) => {
      response = response.data;
      const newTotalCount: number = response.count;
      totalCount.value = newTotalCount;
      totalPages.value = Math.floor(newTotalCount / 10);

      response.results.forEach((obj) => {
        obj.temporal_segment = parseTemporalSegment(obj.temporal_segment);
      });
      tableData.value = response.results;
    })
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      loading.value = false;
    });
  lastDayType.value = dayType;
}

function pageUp() {
  if (currentPage.value == totalPages.value) return;
  currentPage.value++;
  updateSpeedData(dayTypeValue.value, selectedTemporalSegment.value);
}

function pageDown() {
  if (currentPage.value == 1) return;
  currentPage.value--;
  updateSpeedData(dayTypeValue.value, selectedTemporalSegment.value);
}

onMounted(() => {
  updateSpeedData(false);
});
</script>

<template>
  <div class="table-view">
    <div class="table-section-header">
      <span>Velocidades registradas</span>
    </div>
    <div class="table-container">
      <div class="table-buttons-container">
        <div class="options-section">
          <div class="option-container">
            <span>Fecha</span>
            <el-date-picker
              v-model="dateTimeValue"
              type="datetimerange"
              start-placeholder="Fecha inicio"
              end-placeholder="Fecha fin"
              :clearable="false"
            />
          </div>
          <div class="option-container">
            <span>Tipo de día</span>
            <el-select v-model="dayTypeValue" placeholder="Select" style="width: 240px">
              <el-option v-for="item in dayTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="option-container">
            <span>Segmento temporal</span>
            <el-select v-model="selectedTemporalSegment" placeholder="Select" style="width: 240px">
              <el-option
                v-for="item in temporalSegmentOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>

        <el-button @click="updateSpeedData(dayTypeValue, selectedTemporalSegment, false)">Aplicar filtros</el-button>
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
        <el-table-column sortable prop="distance" label="Distance" />
        <el-table-column sortable prop="time_secs" label="Time secs" />
        <el-table-column sortable prop="timestamp" label="timestamp" />
      </el-table>
      <div class="table-pagination">
        <span>{{ totalCount }} registros</span>
        <div class="pagination" v-if="totalPages">
          <el-button :disabled="currentPage == 1" class="pagination-button" @click="pageDown">
            <span class="material-icons">chevron_left</span>
          </el-button>
          <span>{{ currentPage }} de {{ totalPages }}</span>
          <el-button :disabled="currentPage == totalPages" class="pagination-button" @click="pageUp">
            <span class="material-icons">chevron_right</span>
          </el-button>
        </div>
      </div>
    </div>
    <div class="download-container">
      <div class="download-button" @click="downloadSpeeds(dayTypeValue, selectedTemporalSegment)">
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

.table-pagination {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background: white;
  width: 60vw;
  height: 32px;
}

.pagination {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.pagination-button {
  background: #31304d;
  color: white;
}

.table-section-header {
  display: flex;
  background: #31304d;
  height: 88px;
  color: white;
  font-family: Roboto, sans-serif;
  align-items: center;
  padding-left: 16px;
  font-size: 36px;
}
</style>
