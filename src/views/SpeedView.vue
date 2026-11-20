<script setup lang="ts">
import SpeedAPI from "@/components/api/SpeedAPI";
import {
  dayTypeOptions,
  formatUTCToZone,
  parseTemporalSegment,
  temporalSegmentFromTimestamp,
  temporalSegmentRange,
} from "@/utils/date_utils";
import { onMounted, ref } from "vue";

interface Speed {
  shape: number;
  sequence: number;
  temporalSegment: number;
  dayType: string;
  distance: number;
  timeSecs: number;
  timestamp: number;
  timestamp_local?: string;
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

const lastDayType = ref();
const loading = ref(false);
const isDownloading = ref(false);

const tableData = ref<Speed[]>();
const totalCount = ref<number>(0);
const currentPage = ref<number>(1);
const totalPages = ref<number>(1);

// Server-side sorting state
const sortProp = ref<string | null>(null);
const sortOrder = ref<"ascending" | "descending" | null>(null);

function downloadSpeeds(dayType: string | boolean, temporalSegment: number) {
  const startTime = new Date(dateTimeValue.value[0]);
  const endTime = new Date(dateTimeValue.value[1]);

  isDownloading.value = true;

  let downloadPromise;
  let formatSuffix;

  if (selectedTimeFormat.value === "auto") {
    downloadPromise = SpeedAPI.downloadSpeedsLocalAuto(startTime, endTime, dayType, temporalSegment);
    formatSuffix = "_local";
  } else {
    downloadPromise = SpeedAPI.downloadSpeeds(startTime, endTime, dayType, temporalSegment);
    formatSuffix = "_utc";
  }

  downloadPromise
    .then((response) => {
      const csvData = response.data;
      const url = window.URL.createObjectURL(new Blob([csvData]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `speed_${monthString}${formatSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .finally(() => {
      isDownloading.value = false;
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

  // Build ordering parameter for server-side sorting
  let ordering: string | undefined;
  if (sortProp.value) {
    // Map frontend prop names to backend field names
    const propMap: Record<string, string> = {
      shape: "segment__shape",
      sequence: "segment__sequence",
      temporal_segment: "temporal_segment",
      day_type: "day_type",
      distance: "distance",
      time_secs: "time_secs",
      timestamp: "timestamp",
      timestamp_local: "timestamp",
    };
    const backendField = propMap[sortProp.value] || sortProp.value;
    ordering = sortOrder.value === "descending" ? `-${backendField}` : backendField;
  }

  SpeedAPI.getSpeeds(startTime, endTime, dayType, temporalSegment, page, ordering)
    .then((resp) => {
      const response = resp.data as { count: number; results: any[] };
      const newTotalCount: number = response.count;
      totalCount.value = newTotalCount;
      totalPages.value = Math.max(1, Math.ceil(newTotalCount / 10));

      response.results.forEach((obj: any) => {
        // If the backend gave a UTC temporal index, recompute it from the UTC timestamp
        // so the displayed segment corresponds to local (America/Santiago) time.
        if (obj.timestamp) {
          const localIdx = temporalSegmentFromTimestamp(obj.timestamp);
          obj.temporal_segment = parseTemporalSegment(localIdx);
        } else {
          obj.temporal_segment = parseTemporalSegment(obj.temporal_segment);
        }
        // Convert timestamp (epoch seconds or ms) from UTC to America/Santiago
        obj.timestamp_local = formatUTCToZone(obj.timestamp);
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

function handleSortChange({ prop, order }: { prop: string | null; order: "ascending" | "descending" | null }) {
  sortProp.value = prop;
  sortOrder.value = order;
  currentPage.value = 1; // Reset to first page when sorting changes
  updateSpeedData(dayTypeValue.value, selectedTemporalSegment.value);
}

const DAY_LABEL: Record<string, string> = { L: "Laboral", S: "Sábado", D: "Domingo" };

function dayTypeFormatter(row: any) {
  return DAY_LABEL[row.day_type] ?? row.day_type;
}

function speedFormatter(row: any) {
  const d = Number(row.distance);
  const t = Number(row.time_secs);
  return t > 0 ? ((3.6 * d) / t).toFixed(1) : "—";
}

function numberFormatter(_row: any, _col: any, value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : value;
}

onMounted(() => {
  updateSpeedData(false);
});
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>Velocidades registradas</h1>
        <p>
          Una fila por segmento y ventana de 7,5 minutos. La velocidad se calcula como distancia sobre tiempo de los
          buses que cruzaron el segmento.
        </p>
      </div>
    </header>

    <section class="params tile" aria-label="Filtros">
      <div class="param">
        <label for="sv-range">Fecha y hora</label>
        <el-date-picker
          id="sv-range"
          v-model="dateTimeValue"
          type="datetimerange"
          start-placeholder="Desde"
          end-placeholder="Hasta"
          range-separator="→"
          format="YYYY-MM-DD HH:mm"
          :clearable="false"
          style="width: 400px"
        />
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
          @click="updateSpeedData(dayTypeValue, selectedTemporalSegment, false)"
        >
          <span class="material-icons" aria-hidden="true">filter_alt</span>
          Aplicar filtros
        </button>
      </div>
    </section>

    <section class="table-tile tile" aria-label="Velocidades">
      <el-table
        v-loading="loading"
        ref="tableRef"
        row-key="date"
        :data="tableData"
        height="calc(100vh - 420px)"
        style="width: 100%; min-height: 320px"
        empty-text="No hay registros para estos filtros."
        @sort-change="handleSortChange"
      >
        <el-table-column fixed sortable="custom" prop="shape" label="Shape" min-width="90" />
        <el-table-column sortable="custom" prop="sequence" label="Seg." min-width="80" />
        <el-table-column sortable="custom" prop="temporal_segment" label="Intervalo" min-width="170" />
        <el-table-column sortable="custom" prop="day_type" label="Día" min-width="100" :formatter="dayTypeFormatter" />
        <el-table-column label="km/h" min-width="90" align="right" :formatter="speedFormatter" />
        <el-table-column
          sortable="custom"
          prop="distance"
          label="Distancia (m)"
          min-width="130"
          align="right"
          :formatter="numberFormatter"
        />
        <el-table-column
          sortable="custom"
          prop="time_secs"
          label="Tiempo (s)"
          min-width="120"
          align="right"
          :formatter="numberFormatter"
        />
        <el-table-column sortable="custom" prop="timestamp_local" label="Fecha" min-width="180" />
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
        @click="downloadSpeeds(dayTypeValue, selectedTemporalSegment)"
      >
        <span class="material-icons" :class="{ spin: isDownloading }" aria-hidden="true">
          {{ isDownloading ? "progress_activity" : "download" }}
        </span>
        {{ isDownloading ? "Preparando CSV" : "Descargar CSV" }}
      </button>
    </section>
  </div>
</template>
