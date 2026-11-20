import { computed, effectScope, ref, shallowRef } from "vue";
import MapAPI from "@/components/api/MapAPI";
import DashboardAPI from "@/components/api/DashboardAPI";
import { monthOptions, TEMPORAL_MS, temporalSegmentFromUTCIndex, temporalSegmentRange } from "@/utils/date_utils";
import type { ScaleMode } from "@/utils/speedScale";
import { busIds, serviceEntries, VOLUME_BINS } from "@/utils/volume";

export const INTERVALS = temporalSegmentRange;
const TZ = "America/Santiago";

export interface SegmentNow {
  key: string;
  shape: number;
  sequence: number;
  speed: number | null;
  historic: number | null;
  ratio: number | null;
  alert: boolean;
  lengthKm: number;
  /** Distinct buses behind the current speed (0 when there is no reading). */
  volume: number;
  busIds: string[];
}

export interface MatrixCell {
  speed: number | null;
  historic: number | null;
  volume: number | null;
}

export interface MatrixRow {
  sequence: number;
  /** Distance from the start of the axis to the start of this segment. */
  startKm: number;
  lengthKm: number;
  cells: MatrixCell[];
}

export interface AxisSummary {
  shape: number;
  name: string;
  segments: number;
  withData: number;
  below: number;
  alerts: number;
}

export interface AlertNow {
  shape: number | null;
  sequence: number | null;
  speed: number | null;
  useful: number;
  useless: number;
  coords: number[];
  /** Distinct buses behind the alerted reading, when the segment is found. */
  volume: number | null;
}

type LoadState = "idle" | "loading" | "ready" | "error";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function santiagoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

/** UTC instant of 00:00 in Santiago for the Santiago calendar day of `date`. */
export function santiagoMidnight(date: Date) {
  const p = santiagoParts(date);
  let guess = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  // Two passes resolve the offset, including DST transition days.
  for (let i = 0; i < 2; i++) {
    const q = santiagoParts(new Date(guess));
    const wall = Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute, q.second);
    guess -= wall - Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  }
  return new Date(guess);
}

export function santiagoDayType(date: Date) {
  const weekday = santiagoParts(date).weekday;
  if (weekday === "Sun") return "D";
  if (weekday === "Sat") return "S";
  return "L";
}

const DAY_TYPE_LABEL: Record<string, string> = {
  L: "Laboral",
  S: "Sábado",
  D: "Domingo",
};

function parseCSV(text: unknown): string[][] {
  if (typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line) rows.push(line.split(","));
  }
  return rows;
}

/** "Eje Alameda_1.0" -> "Alameda · sentido 1" (the sentido must survive truncation). */
export function formatShapeName(raw: string, id: number) {
  const name = raw.trim().replace(/^Eje\s+/i, "");
  if (!name) return `Shape ${id}`;
  const m = name.match(/^(.*)_(\d+)(?:\.0+)?$/);
  return m ? `${m[1].trim()} · sentido ${m[2]}` : name;
}

/** Compact form for dense rows: "Alameda · S1". */
export function shortShapeName(name: string) {
  return name.replace(" · sentido ", " · S");
}

/** Readings below this are kept on the map but not ranked (likely measurement gaps). */
export const PLAUSIBLE_KMH = 1;

function lineLengthKm(coords: number[][]) {
  let km = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
    km += 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return km;
}

function mean(values: number[]) {
  if (!values.length) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function createDashboardData() {
  // View choices survive between visits along with the data.
  const selectedShape = ref<number | null>(null);
  // The panel reads anomalies, so it starts relative to each segment's historic.
  const scaleMode = ref<ScaleMode>("ratio");
  /** Segments exactly as the live feed serves them (the interval in course). */
  const liveSegments = shallowRef<SegmentNow[]>([]);
  const alerts = shallowRef<AlertNow[]>([]);
  const shapeNames = shallowRef<Map<number, string>>(new Map());
  const nowUtcIndex = ref<number | null>(null);

  const buses = ref<number | null>(null);
  const services = ref<number | null>(null);

  // key -> INTERVALS local intervals
  const todayBySegment = shallowRef<Map<string, (number | null)[]>>(new Map());
  const todayVolumeBySegment = shallowRef<Map<string, (number | null)[]>>(new Map());
  /** Distinct buses measured on the axes per local interval (null = no readings). */
  const dayVolume = shallowRef<(number | null)[]>(new Array(INTERVALS).fill(null));
  const historicBySegment = shallowRef<Map<string, (number | null)[]>>(new Map());
  const historicMonthLabel = ref("");
  const dayTypeLabel = ref("");

  const liveState = ref<LoadState>("idle");
  const busState = ref<LoadState>("idle");
  const seriesState = ref<LoadState>("idle");
  const updatedAt = ref<Date | null>(null);

  let historicKey = "";

  async function loadLive() {
    liveState.value = liveState.value === "ready" ? "ready" : "loading";
    try {
      const { data } = await MapAPI.getMapData();
      const features = data?.geojson?.features ?? [];
      const list: SegmentNow[] = [];
      let utcIdx: number | null = null;
      for (const f of features) {
        const p = f?.properties ?? {};
        const shape = Number(p.shape_id);
        const sequence = Number(p.sequence);
        if (!Number.isFinite(shape) || !Number.isFinite(sequence)) continue;
        const speed = toNumber(p.speed);
        const historic = toNumber(p.historic_speed);
        const ids = speed === null ? [] : busIds(serviceEntries(p.active_services));
        if (utcIdx === null && toNumber(p.temporal_segment) !== null) {
          utcIdx = Number(p.temporal_segment);
        }
        list.push({
          key: `${shape}|${sequence}`,
          shape,
          sequence,
          speed,
          historic,
          ratio: speed !== null && historic !== null && historic > 0 ? speed / historic : null,
          alert: p.alert_id !== undefined && p.alert_id !== null,
          lengthKm: Array.isArray(f?.geometry?.coordinates) ? lineLengthKm(f.geometry.coordinates) : 0,
          volume: ids.length,
          busIds: ids,
        });
      }
      liveSegments.value = list;
      nowUtcIndex.value = utcIdx;
      const byKey = new Map(list.map((s) => [s.key, s]));
      alerts.value = (data?.alerts ?? []).map((a: any) => {
        // key_value: shape|sequence|day_type|temporal_segment|speed
        const parts = String(a.key_value ?? "").split("|");
        const seg = byKey.get(`${parts[0]}|${parts[1]}`);
        return {
          shape: toNumber(parts[0]),
          sequence: toNumber(parts[1]),
          speed: toNumber(parts[4]),
          useful: Number(a.useful) || 0,
          useless: Number(a.useless) || 0,
          coords: a.coords ?? [],
          volume: seg && seg.speed !== null ? seg.volume : null,
        };
      });
      updatedAt.value = new Date();
      liveState.value = "ready";
    } catch (e) {
      console.error("Panel: error loading map data", e);
      liveState.value = "error";
    }
  }

  const busWindow = ref<"interval" | "minute">("interval");

  function countPulses(data: any) {
    const plates = new Set<string>();
    const routes = new Set<string>();
    for (const f of data?.features ?? []) {
      const p = f?.properties ?? {};
      if (p.license_plate && p.license_plate !== "NN") plates.add(p.license_plate);
      if (p.service) routes.add(String(p.service));
    }
    return { plates: plates.size, routes: routes.size };
  }

  async function loadBuses() {
    busState.value = busState.value === "ready" ? "ready" : "loading";
    try {
      let { data } = await DashboardAPI.getPulses();
      let counts = countPulses(data);
      busWindow.value = "interval";
      // Right after a cut the new interval has no pulses yet: fall back to the
      // last recorded minute instead of reporting zero buses.
      if (!counts.plates) {
        ({ data } = await DashboardAPI.getPulses(true));
        counts = countPulses(data);
        busWindow.value = "minute";
      }
      buses.value = counts.plates;
      services.value = counts.routes;
      busState.value = "ready";
    } catch (e) {
      console.error("Panel: error loading GPS pulses", e);
      busState.value = "error";
    }
  }

  async function loadShapeNames() {
    if (shapeNames.value.size) return;
    try {
      const names = new Map<number, string>();
      let page = 1;
      // Paginated (10 per page); stop defensively after 50 pages.
      while (page <= 50) {
        const { data } = await DashboardAPI.getShapesPage(page);
        const results = Array.isArray(data) ? data : data?.results ?? [];
        for (const s of results) {
          if (s?.id !== undefined) {
            names.set(Number(s.id), formatShapeName(String(s.name ?? ""), Number(s.id)));
          }
        }
        if (Array.isArray(data) || !data?.next) break;
        page++;
      }
      shapeNames.value = names;
    } catch (e) {
      // Names are a nicety; the panel falls back to shape ids.
      console.warn("Panel: could not load shape names", e);
    }
  }

  // Raw per-interval sums keyed "shape|sequence|localIndex", kept between refreshes
  // so a refresh only downloads the last hour instead of the whole day (~5 MB).
  type DaySlot = { d: number; t: number; ids: Set<string> };
  let todayAcc = new Map<string, DaySlot>();
  let todayDay = "";
  let todayFetchedTo: Date | null = null;

  async function loadToday(now: Date) {
    const midnight = santiagoMidnight(now);
    const dayKey = midnight.toISOString();
    const incremental = dayKey === todayDay && todayFetchedTo !== null;
    const QUARTER = TEMPORAL_MS;
    // Align the window to a temporal-segment boundary so re-downloaded intervals are whole.
    const start = incremental
      ? new Date(
          Math.max(
            midnight.getTime(),
            Math.floor(((todayFetchedTo as Date).getTime() - 60 * 60 * 1000) / QUARTER) * QUARTER
          )
        )
      : midnight;
    const { data } = await DashboardAPI.getSpeedsCSV(start, now);

    const acc = incremental ? new Map(todayAcc) : new Map<string, DaySlot>();
    // UTC -> Santiago interval shift for this day (computed once, not per row).
    const shift = temporalSegmentFromUTCIndex(0, now);
    const fresh = new Map<string, DaySlot>();
    for (const row of parseCSV(data)) {
      // shape,sequence,temporal_segment,day_type,distance,time_secs,timestamp,active_services
      const utcIdx = Number(row[2]);
      const distance = Number(row[4]);
      const time = Number(row[5]);
      if (!Number.isFinite(utcIdx) || !(time > 0) || !(distance >= 0)) continue;
      const local = (((utcIdx + shift) % INTERVALS) + INTERVALS) % INTERVALS;
      const key = `${row[0]}|${row[1]}|${local}`;
      const slot = fresh.get(key) ?? { d: 0, t: 0, ids: new Set<string>() };
      slot.d += distance;
      slot.t += time;
      for (const id of busIds(serviceEntries(row[7]))) slot.ids.add(id);
      fresh.set(key, slot);
    }
    // Re-downloaded intervals replace what we had for them.
    fresh.forEach((slot, key) => acc.set(key, slot));
    todayAcc = acc;
    todayDay = dayKey;
    todayFetchedTo = now;

    const bySegment = new Map<string, (number | null)[]>();
    const volBySegment = new Map<string, (number | null)[]>();
    const networkIds: Set<string>[] = Array.from({ length: INTERVALS }, () => new Set<string>());
    acc.forEach((slot, key) => {
      const [shape, seq, local] = key.split("|");
      const segKey = `${shape}|${seq}`;
      const i = Number(local);
      const arr = bySegment.get(segKey) ?? new Array(INTERVALS).fill(null);
      arr[i] = slot.t > 0 ? (3.6 * slot.d) / slot.t : null;
      bySegment.set(segKey, arr);
      const vol = volBySegment.get(segKey) ?? new Array(INTERVALS).fill(null);
      vol[i] = slot.ids.size;
      volBySegment.set(segKey, vol);
      slot.ids.forEach((id) => networkIds[i].add(id));
    });
    todayBySegment.value = bySegment;
    todayVolumeBySegment.value = volBySegment;
    // Distinct buses measured anywhere on the axes, per interval.
    dayVolume.value = networkIds.map((ids) => (ids.size ? ids.size : null));
  }

  async function loadHistoric(now: Date) {
    const p = santiagoParts(now);
    const dayType = santiagoDayType(now);
    const key = `${p.month}|${dayType}`;
    if (key === historicKey && historicBySegment.value.size) return;

    const tryMonth = async (month: number) => {
      const { data } = await DashboardAPI.getHistoricCSV(month, dayType);
      return parseCSV(data);
    };
    let month = p.month;
    let rows = await tryMonth(month);
    if (!rows.length) {
      month = month === 1 ? 12 : month - 1;
      rows = await tryMonth(month);
    }
    const acc = new Map<string, number[]>();
    const shift = temporalSegmentFromUTCIndex(0, now);
    for (const row of rows) {
      // shape,sequence,temporal_segment,day_type,speed
      const utcIdx = Number(row[2]);
      const speed = Number(row[4]);
      if (!Number.isFinite(utcIdx) || !Number.isFinite(speed)) continue;
      const local = (((utcIdx + shift) % INTERVALS) + INTERVALS) % INTERVALS;
      const k = `${row[0]}|${row[1]}|${local}`;
      const list = acc.get(k) ?? [];
      list.push(speed);
      acc.set(k, list);
    }
    const bySegment = new Map<string, (number | null)[]>();
    acc.forEach((list, k) => {
      const [shape, seq, local] = k.split("|");
      const segKey = `${shape}|${seq}`;
      const arr = bySegment.get(segKey) ?? new Array(INTERVALS).fill(null);
      arr[Number(local)] = mean(list);
      bySegment.set(segKey, arr);
    });
    historicBySegment.value = bySegment;
    historicKey = key;
    historicMonthLabel.value = monthOptions.find((m) => m.value === month)?.label ?? String(month);
    dayTypeLabel.value = DAY_TYPE_LABEL[dayType];
  }

  async function loadSeries() {
    const now = new Date();
    seriesState.value = seriesState.value === "ready" ? "ready" : "loading";
    try {
      await Promise.all([loadToday(now), loadHistoric(now)]);
      seriesState.value = "ready";
    } catch (e) {
      console.error("Panel: error loading day series", e);
      seriesState.value = "error";
    }
  }

  async function refresh(full = false) {
    const jobs: Promise<unknown>[] = [loadLive(), loadBuses(), loadSeries()];
    if (full) jobs.push(loadShapeNames());
    await Promise.allSettled(jobs);
  }

  // ---------- Derived readings ----------

  /** Last local interval of today that has any speed in the day series. */
  const lastSeriesIndex = computed(() => {
    let last = -1;
    todayBySegment.value.forEach((arr) => {
      for (let i = arr.length - 1; i > last; i--) {
        if (arr[i] !== null && arr[i] !== undefined) {
          last = i;
          break;
        }
      }
    });
    return last < 0 ? null : last;
  });

  /** The feed answered, but the interval in course has no speeds yet. */
  const liveEmpty = computed(
    () =>
      liveState.value === "ready" && liveSegments.value.length > 0 && !liveSegments.value.some((s) => s.speed !== null)
  );

  /**
   * Right after each cut the feed serves an interval whose speeds are not
   * processed yet (about 5 minutes). Instead of a panel of dashes, read the
   * last processed interval from the day series and say which one it is.
   */
  const segments = computed<SegmentNow[]>(() => {
    const idx = lastSeriesIndex.value;
    if (!liveEmpty.value || idx === null) return liveSegments.value;
    const today = todayBySegment.value;
    const hist = historicBySegment.value;
    return liveSegments.value.map((s) => {
      const speed = today.get(s.key)?.[idx] ?? null;
      const historic = hist.get(s.key)?.[idx] ?? null;
      const ids = speed === null ? [] : [...(todayAcc.get(`${s.key}|${idx}`)?.ids ?? [])];
      return {
        ...s,
        speed,
        historic,
        ratio: speed !== null && historic !== null && historic > 0 ? speed / historic : null,
        volume: ids.length,
        busIds: ids,
      };
    });
  });
  /** Local interval the readings come from when they are not the live one. */
  const fallbackIndex = computed(() =>
    liveEmpty.value && lastSeriesIndex.value !== null && segments.value.some((s) => s.speed !== null)
      ? lastSeriesIndex.value
      : null
  );

  const withData = computed(() => segments.value.filter((s) => s.speed !== null));
  const compared = computed(() => segments.value.filter((s) => s.ratio !== null));

  const networkSpeed = computed(() => mean(compared.value.map((s) => s.speed as number)));
  const networkHistoric = computed(() => mean(compared.value.map((s) => s.historic as number)));
  const belowHistoric = computed(() => compared.value.filter((s) => (s.ratio as number) < 1).length);

  const feedback = computed(() =>
    alerts.value.reduce((acc, a) => ({ useful: acc.useful + a.useful, useless: acc.useless + a.useless }), {
      useful: 0,
      useless: 0,
    })
  );

  const implausible = computed(() => compared.value.filter((s) => (s.speed as number) < PLAUSIBLE_KMH).length);
  const worst = computed(() =>
    compared.value
      .filter((s) => (s.speed as number) >= PLAUSIBLE_KMH)
      .sort((a, b) => (a.ratio as number) - (b.ratio as number))
      .slice(0, 8)
  );

  const axes = computed<AxisSummary[]>(() => {
    const byShape = new Map<number, AxisSummary>();
    for (const s of segments.value) {
      const entry =
        byShape.get(s.shape) ??
        ({
          shape: s.shape,
          name: shapeNames.value.get(s.shape) || `Shape ${s.shape}`,
          segments: 0,
          withData: 0,
          below: 0,
          alerts: 0,
        } as AxisSummary);
      entry.segments++;
      if (s.speed !== null) entry.withData++;
      if (s.ratio !== null && s.ratio < 1) entry.below++;
      if (s.alert) entry.alerts++;
      byShape.set(s.shape, entry);
    }
    return [...byShape.values()].sort((a, b) => b.alerts - a.alerts || b.below - a.below || a.shape - b.shape);
  });

  function matrixFor(shape: number): MatrixRow[] {
    const rows = segments.value.filter((s) => s.shape === shape).sort((a, b) => a.sequence - b.sequence);
    let km = 0;
    return rows.map((s) => {
      const today = todayBySegment.value.get(s.key);
      const hist = historicBySegment.value.get(s.key);
      const cells: MatrixCell[] = new Array(INTERVALS);
      for (let i = 0; i < INTERVALS; i++) {
        cells[i] = {
          speed: today?.[i] ?? null,
          historic: hist?.[i] ?? null,
          volume: todayVolumeBySegment.value.get(s.key)?.[i] ?? null,
        };
      }
      const row = { sequence: s.sequence, startKm: km, lengthKm: s.lengthKm, cells };
      km += s.lengthKm;
      return row;
    });
  }

  /** Network mean per local interval: today (segments with data) and historic. */
  const dayCurve = computed(() => {
    const today: (number | null)[] = new Array(INTERVALS).fill(null);
    const historic: (number | null)[] = new Array(INTERVALS).fill(null);
    for (let i = 0; i < INTERVALS; i++) {
      const t: number[] = [];
      const h: number[] = [];
      todayBySegment.value.forEach((arr) => {
        const v = arr[i];
        if (v !== null && v !== undefined) t.push(v);
      });
      historicBySegment.value.forEach((arr) => {
        const v = arr[i];
        if (v !== null && v !== undefined) h.push(v);
      });
      today[i] = mean(t);
      historic[i] = mean(h);
    }
    return { today, historic };
  });

  /** Volume behind the live readings (current interval, from mapData). */
  const volumeStats = computed(() => {
    const measured = withData.value;
    const ids = new Set<string>();
    let passages = 0;
    const vols: number[] = [];
    for (const s of measured) {
      passages += s.volume;
      vols.push(s.volume);
      s.busIds.forEach((id) => ids.add(id));
    }
    vols.sort((a, b) => a - b);
    const median = vols.length
      ? vols.length % 2
        ? vols[(vols.length - 1) / 2]
        : (vols[vols.length / 2 - 1] + vols[vols.length / 2]) / 2
      : null;
    const bins = VOLUME_BINS.map((b) => ({
      label: b.label,
      count: vols.filter((v) => v >= b.min && v <= b.max).length,
    }));
    return {
      buses: ids.size,
      passages,
      median,
      single: vols.filter((v) => v === 1).length,
      measured: measured.length,
      bins,
    };
  });

  return {
    // view state
    selectedShape,
    scaleMode,
    // state
    segments,
    liveEmpty,
    fallbackIndex,
    alerts,
    buses,
    services,
    busWindow,
    liveState,
    busState,
    seriesState,
    updatedAt,
    nowUtcIndex,
    historicMonthLabel,
    dayTypeLabel,
    // derived
    withData,
    compared,
    networkSpeed,
    networkHistoric,
    belowHistoric,
    feedback,
    worst,
    implausible,
    axes,
    dayCurve,
    dayVolume,
    volumeStats,
    lastSeriesIndex,
    matrixFor,
    shapeNames,
    // actions
    refresh,
    loadSeries,
    loadLive,
    loadBuses,
    loadShapeNames,
  };
}

/**
 * The Panel's data lives for the whole session, not per visit: re-entering the
 * tab reuses what is already loaded (including the ~5 MB day series) and only
 * refreshes when a new temporal-segment cut has happened since the last load.
 */
let shared: ReturnType<typeof createDashboardData> | null = null;

export function useDashboardData() {
  if (!shared) {
    // A detached scope keeps the computeds alive after the Panel unmounts.
    shared = effectScope(true).run(createDashboardData) ?? createDashboardData();
  }
  return shared;
}

/** True when the data predates the most recent refresh tick (59 s after each segment cut). */
export function isStale(updatedAt: Date | null, now = new Date()) {
  if (!updatedAt) return true;
  const tick = new Date(now);
  const offset = 59 * 1000;
  const cut = Math.floor((now.getTime() - offset) / TEMPORAL_MS) * TEMPORAL_MS + offset;
  return updatedAt.getTime() < cut;
}
