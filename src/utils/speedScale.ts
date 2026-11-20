/**
 * Speed scale shared by the map, the space-time matrix, the day curve and
 * every legend. Slow reads hot (red, orange), fast reads cool (green, teal,
 * blue), so what is anomalous is what the eye finds first.
 */

export type Theme = "dark" | "light";
export type ScaleMode = "kmh" | "ratio";

export interface ScaleBin {
  /** Inclusive lower bound (km/h, or ratio speed/historic). */
  min: number;
  /** Exclusive upper bound; Infinity for the last bin. */
  max: number;
  label: string;
}

export const KMH_BINS: ScaleBin[] = [
  { min: 0, max: 5, label: "< 5" },
  { min: 5, max: 10, label: "5–10" },
  { min: 10, max: 15, label: "10–15" },
  { min: 15, max: 20, label: "15–20" },
  { min: 20, max: 25, label: "20–25" },
  { min: 25, max: 30, label: "25–30" },
  { min: 30, max: Infinity, label: "≥ 30" },
];

export const RATIO_BINS: ScaleBin[] = [
  { min: 0, max: 0.5, label: "< 50%" },
  { min: 0.5, max: 0.7, label: "50–70%" },
  { min: 0.7, max: 0.85, label: "70–85%" },
  { min: 0.85, max: 1, label: "85–100%" },
  { min: 1, max: 1.15, label: "100–115%" },
  { min: 1.15, max: 1.3, label: "115–130%" },
  { min: 1.3, max: Infinity, label: "≥ 130%" },
];

const RAMP: Record<Theme, string[]> = {
  // High-contrast spectral ramp: saturated red/orange for congestion,
  // yellow-lime for the 10–20 km/h transition, green/teal/blue for free flow.
  // Hue jumps between neighbours so each bin reads at a glance on the map.
  dark: ["#ff4136", "#ff8a1f", "#ffd23f", "#b5e550", "#3fd27a", "#1fb8d0", "#4a8cff"],
  light: ["#c81e1e", "#e2650f", "#d4a000", "#7fa81a", "#1f9a52", "#0f8aa0", "#2659c4"],
};

export const NO_DATA_COLOR: Record<Theme, string> = {
  dark: "#5d6166",
  light: "#cfccc6",
};

export function bins(mode: ScaleMode): ScaleBin[] {
  return mode === "kmh" ? KMH_BINS : RATIO_BINS;
}

export function ramp(theme: Theme): string[] {
  return RAMP[theme];
}

export function binIndex(value: number | null, mode: ScaleMode): number {
  if (value === null || !Number.isFinite(value)) return -1;
  const list = bins(mode);
  for (let i = 0; i < list.length; i++) {
    if (value >= list[i].min && value < list[i].max) return i;
  }
  return value < 0 ? -1 : list.length - 1;
}

export function colorFor(value: number | null, mode: ScaleMode, theme: Theme): string {
  const idx = binIndex(value, mode);
  return idx < 0 ? NO_DATA_COLOR[theme] : RAMP[theme][idx];
}

export function modeUnit(mode: ScaleMode) {
  return mode === "kmh" ? "KM/H" : "% DEL HISTÓRICO";
}

/**
 * Mapbox `step` expression over a numeric input expression.
 * `input` must evaluate to a number, or a negative number for "no data".
 */
export function mapboxStep(input: unknown[], mode: ScaleMode, theme: Theme): unknown[] {
  const list = bins(mode);
  const colors = RAMP[theme];
  const expr: unknown[] = ["step", input, NO_DATA_COLOR[theme], 0, colors[0]];
  for (let i = 1; i < list.length; i++) {
    expr.push(list[i].min, colors[i]);
  }
  return expr;
}
