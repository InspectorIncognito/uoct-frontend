<script setup lang="ts">
import SpeedAPI from "@/components/api/SpeedAPI";
import {
  dayTypeOptions,
  formatUTCToZone,
  monthOptions,
  parseTemporalSegment,
  temporalSegmentFromUTCIndex,
  temporalSegmentRange,
} from "@/utils/date_utils";
import { onMounted, ref } from "vue";

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

const monthValue = ref(monthOptions[currentMonth - 1].value);

const dayTypeValue = ref(dayTypeOptions[dayTypeOptions.length - 1].value);

const temporalSegmentOptions: Array<{ label: string; value: number }> =
  Array.from({ length: temporalSegmentRange }, (_, t) => ({
    label: parseTemporalSegment(t),
    value: t,
  }));
temporalSegmentOptions.unshift({ label: "Todos", value: -1 });
const selectedTemporalSegment = ref(-1);

const timeFormatOptions = [
  { value: "local", label: "Hora Local (Santiago)" },
  { value: "utc", label: "UTC" },
];
const selectedTimeFormat = ref("local");

const lastMonth = ref();
const lastDayType = ref();

const loading = ref(false);

const tableData = ref<HistoricSpeed[]>();

const totalCount = ref<number>(0);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);

function downloadHistoricSpeeds(
  month: number,
  dayType: string | boolean,
  temporalSegment: number
) {
  SpeedAPI.downloadHistoricSpeeds(month, dayType, temporalSegment).then(
    (response) => {
      let csvData = response.data;

      // Si el formato es local, convertir timestamps en el CSV
      if (selectedTimeFormat.value === "local") {
        csvData = convertCSVTimestamps(csvData);
      }

      const url = window.URL.createObjectURL(new Blob([csvData]));
      const link = document.createElement("a");
      link.href = url;
      const formatSuffix =
        selectedTimeFormat.value === "local" ? "_local" : "_utc";
      link.setAttribute(
        "download",
        `historic_speed_${month_string}${formatSuffix}.csv`
      );
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  );
}

function convertCSVTimestamps(csvText: string): string {
  const lines = csvText.split("\n");
  if (lines.length === 0) return csvText;

  const header = lines[0];
  const headers = header.split(",");
  const timestampIndex = headers.findIndex((h) =>
    h.toLowerCase().includes("timestamp")
  );

  if (timestampIndex === -1) return csvText; // No hay columna timestamp

  const convertedLines = [header];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const cols = lines[i].split(",");
    if (cols.length > timestampIndex) {
      const timestamp = cols[timestampIndex];
      if (timestamp && !isNaN(Number(timestamp))) {
        cols[timestampIndex] = formatUTCToZone(Number(timestamp));
      }
    }
    convertedLines.push(cols.join(","));
  }

  return convertedLines.join("\n");
}

onMounted(() => {
  updateHistoricSpeedData(currentMonth, false);
});

function updateHistoricSpeedData(
  month: number,
  dayType: string | boolean,
  temporalSegment = -1,
  usePage = true
) {
  loading.value = true;
  if (!usePage) {
    currentPage.value = 1;
  }
  const page = currentPage.value;
  SpeedAPI.getHistoricSpeeds(month, dayType, temporalSegment, page)
    .then((response) => {
      const data = response.data;
      const newTotalCount: number = data.count;
      totalCount.value = newTotalCount;
      totalPages.value = Math.floor(newTotalCount / 10);

      data.results.forEach((obj: any) => {
        // For historic data the response.temporal_segment is likely computed in UTC.
        // Map it to local segment using the queried month as reference for DST.
        try {
          const refDate = new Date(new Date().getFullYear(), month - 1, 1);
          const localIdx = temporalSegmentFromUTCIndex(
            obj.temporal_segment,
            refDate
          );
          obj.temporal_segment = parseTemporalSegment(localIdx);
        } catch (e) {
          obj.temporal_segment = parseTemporalSegment(obj.temporal_segment);
        }
      });
      tableData.value = data.results;
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

function pageUp() {
  if (currentPage.value == totalPages.value) return;
  currentPage.value++;
  updateHistoricSpeedData(
    monthValue.value,
    dayTypeValue.value,
    selectedTemporalSegment.value
  );
}

function pageDown() {
  if (currentPage.value == 1) return;
  currentPage.value--;
  updateHistoricSpeedData(
    monthValue.value,
    dayTypeValue.value,
    selectedTemporalSegment.value
  );
}
</script>

<template>
  <div class="table-view">
    <div class="table-section-header">
      <span>Velocidades Agregadas</span>
    </div>
    <div class="table-container">
      <div class="table-buttons-container">
        <div class="options-section">
          <div class="option-container">
            <span>Mes</span>
            <el-select
              v-model="monthValue"
              placeholder="Select"
              style="width: 240px"
            >
              <el-option
                v-for="item in monthOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
          <div class="option-container">
            <span>Tipo de día</span>
            <el-select
              v-model="dayTypeValue"
              placeholder="Select"
              style="width: 240px"
            >
              <el-option
                v-for="item in dayTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
          <div class="option-container">
            <span>Segmento temporal</span>
            <el-select
              v-model="selectedTemporalSegment"
              placeholder="Select"
              style="width: 240px"
            >
              <el-option
                v-for="item in temporalSegmentOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
        </div>

        <el-button
          @click="
            updateHistoricSpeedData(
              monthValue,
              dayTypeValue,
              selectedTemporalSegment,
              false
            )
          "
          >Aplicar filtros
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        class="historic-speed-table"
        ref="tableRef"
        row-key="date"
        :data="tableData"
        style="width: 60vw; height: 50vh"
      >
        <el-table-column
          fixed
          sortable
          prop="shape"
          label="Shape"
          column-key="Shape"
        />
        <el-table-column sortable prop="sequence" label="Secuencia" />
        <el-table-column
          sortable
          prop="temporal_segment"
          label="Segmento Temporal"
        />
        <el-table-column sortable prop="day_type" label="Tipo de Día" />
        <el-table-column sortable prop="speed" label="Velocidad" />
      </el-table>
      <div class="table-pagination">
        <span>{{ totalCount }} registros</span>
        <div class="pagination" v-if="totalPages">
          <el-button
            :disabled="currentPage == 1"
            class="pagination-button"
            @click="pageDown"
          >
            <span class="material-icons">chevron_left</span>
          </el-button>
          <span>{{ currentPage }} de {{ totalPages }}</span>
          <el-button
            :disabled="currentPage == totalPages"
            class="pagination-button"
            @click="pageUp"
          >
            <span class="material-icons">chevron_right</span>
          </el-button>
        </div>
      </div>
    </div>
    <div class="download-container">
      <div class="download-info">
        <span
          >Formato:
          {{
            selectedTimeFormat === "local" ? "Hora Local (Santiago)" : "UTC"
          }}</span
        >
      </div>
      <div
        class="download-button"
        @click="
          downloadHistoricSpeeds(
            monthValue,
            dayTypeValue,
            selectedTemporalSegment
          )
        "
      >
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
  gap: 16px;
  padding: 8px 8px;
}

.download-info {
  color: white;
  font-size: 14px;
}

.download-info {
  color: white;
  font-size: 14px;
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
  background: #161a30;
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
  height: 10vh;
  font-size: 2vw;
  color: white;
  font-family: Roboto, sans-serif;
  align-items: center;
  padding-left: 16px;
}
</style>
