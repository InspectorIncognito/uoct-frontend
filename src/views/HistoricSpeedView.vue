<script setup lang="ts">
import SpeedAPI from "@/components/api/SpeedAPI";
import {
  dayTypeOptions,
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

const temporalSegmentOptions: Array<{ label: string; value: number }> = Array.from(
  { length: temporalSegmentRange },
  (_, t) => ({
    label: parseTemporalSegment(t),
    value: t,
  })
);
temporalSegmentOptions.unshift({ label: "Todos", value: -1 });
const selectedTemporalSegment = ref(-1);

const timeFormatOptions = [
  { value: "auto", label: "Hora Local (Chile)" },
  { value: "utc", label: "UTC" },
];
const selectedTimeFormat = ref("auto");

const lastMonth = ref();
const lastDayType = ref();

const loading = ref(false);
const isDownloading = ref(false);

const tableData = ref<HistoricSpeed[]>();

const totalCount = ref<number>(0);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);

function downloadHistoricSpeeds(month: number, dayType: string | boolean, temporalSegment: number) {
  isDownloading.value = true;

  let downloadPromise;
  let formatSuffix;

  if (selectedTimeFormat.value === "auto") {
    downloadPromise = SpeedAPI.downloadHistoricSpeedsLocalAuto(month, dayType, temporalSegment);
    formatSuffix = "_local";
  } else {
    downloadPromise = SpeedAPI.downloadHistoricSpeeds(month, dayType, temporalSegment);
    formatSuffix = "_utc";
  }

  downloadPromise
    .then((response) => {
      const csvData = response.data;
      const url = window.URL.createObjectURL(new Blob([csvData]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `historic_speed_${month_string}${formatSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .finally(() => {
      isDownloading.value = false;
    });
}

onMounted(() => {
  updateHistoricSpeedData(currentMonth, false);
});

function updateHistoricSpeedData(month: number, dayType: string | boolean, temporalSegment = -1, usePage = true) {
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
      totalPages.value = Math.ceil(newTotalCount / 10);

      data.results.forEach((obj: any) => {
        // For historic data the response.temporal_segment is likely computed in UTC.
        // Map it to local segment using the queried month as reference for DST.
        try {
          const refDate = new Date(new Date().getFullYear(), month - 1, 1);
          const localIdx = temporalSegmentFromUTCIndex(obj.temporal_segment, refDate);
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

const DAY_LABEL: Record<string, string> = { L: "Laboral", S: "Sábado", D: "Domingo" };

function dayTypeFormatter(row: any) {
  return DAY_LABEL[row.day_type] ?? row.day_type;
}

function numberFormatter(_row: any, _col: any, value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : value;
}

function pageUp() {
  if (currentPage.value == totalPages.value) return;
  currentPage.value++;
  updateHistoricSpeedData(monthValue.value, dayTypeValue.value, selectedTemporalSegment.value);
}

function pageDown() {
  if (currentPage.value == 1) return;
  currentPage.value--;
  updateHistoricSpeedData(monthValue.value, dayTypeValue.value, selectedTemporalSegment.value);
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Velocidades históricas por mes</h1>
        <p>
          Velocidad de referencia de cada segmento por tipo de día e intervalo de 7,5 minutos. Es la base contra la que
          se comparan el mapa, el panel y las alertas.
        </p>
      </div>
    </header>

    <section class="params tile" aria-label="Filtros">
      <div class="param">
        <span class="param-label">Mes</span>
        <el-select v-model="monthValue" style="width: 180px" aria-label="Mes">
          <el-option v-for="item in monthOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="param">
        <span class="param-label">Tipo de día</span>
        <el-select v-model="dayTypeValue" style="width: 180px" aria-label="Tipo de día">
          <el-option v-for="item in dayTypeOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="param">
        <span class="param-label">Intervalo</span>
        <el-select
          v-model="selectedTemporalSegment"
          filterable
          style="width: 220px"
          aria-label="Intervalo de 7,5 minutos"
        >
          <el-option v-for="item in temporalSegmentOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="params-actions">
        <button
          type="button"
          class="btn btn--primary"
          :disabled="loading"
          @click="updateHistoricSpeedData(monthValue, dayTypeValue, selectedTemporalSegment, false)"
        >
          <span class="material-icons" aria-hidden="true">filter_alt</span>
          Aplicar filtros
        </button>
      </div>
    </section>

    <section class="table-tile tile" aria-label="Velocidades históricas">
      <el-table
        v-loading="loading"
        ref="tableRef"
        row-key="date"
        :data="tableData"
        height="calc(100vh - 420px)"
        style="width: 100%; min-height: 320px"
        empty-text="No hay velocidades históricas para estos filtros."
      >
        <el-table-column fixed sortable prop="shape" label="Shape" min-width="90" />
        <el-table-column sortable prop="sequence" label="Seg." min-width="80" />
        <el-table-column sortable prop="temporal_segment" label="Intervalo" min-width="170" />
        <el-table-column sortable prop="day_type" label="Día" min-width="100" :formatter="dayTypeFormatter" />
        <el-table-column
          sortable
          prop="speed"
          label="km/h"
          min-width="100"
          align="right"
          :formatter="numberFormatter"
        />
      </el-table>
      <div class="table-meta">
        <span class="table-note">
          <span class="material-icons" aria-hidden="true">schedule</span>
          Hora de Chile (America/Santiago), con cambio de horario automático.
        </span>
        <div class="pager num" v-if="totalPages">
          <span>{{ totalCount.toLocaleString("es-CL") }} registros</span>
          <button
            type="button"
            class="btn"
            :disabled="currentPage == 1 || loading"
            aria-label="Página anterior"
            @click="pageDown"
          >
            <span class="material-icons" aria-hidden="true">chevron_left</span>
          </button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button
            type="button"
            class="btn"
            :disabled="currentPage == totalPages || loading"
            aria-label="Página siguiente"
            @click="pageUp"
          >
            <span class="material-icons" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      </div>
    </section>

    <section class="download tile" aria-label="Descarga">
      <div class="param">
        <span class="param-label">Hora en el archivo</span>
        <el-select v-model="selectedTimeFormat" style="width: 240px" aria-label="Hora en el archivo">
          <el-option v-for="item in timeFormatOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <button
        type="button"
        class="btn"
        :disabled="isDownloading"
        @click="downloadHistoricSpeeds(monthValue, dayTypeValue, selectedTemporalSegment)"
      >
        <span class="material-icons" :class="{ spin: isDownloading }" aria-hidden="true">
          {{ isDownloading ? "progress_activity" : "download" }}
        </span>
        {{ isDownloading ? "Preparando CSV" : "Descargar CSV" }}
      </button>
    </section>
  </div>
</template>
