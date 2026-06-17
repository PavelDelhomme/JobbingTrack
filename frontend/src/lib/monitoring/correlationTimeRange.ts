export type CorrelationWindowMode = "preset" | "custom";

export const MAX_CUSTOM_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function computeQueryBounds(params: {
  windowMode: CorrelationWindowMode;
  presetHours: number;
  appliedCustom: { startIso: string; endIso: string } | null;
}): { start: Date; end: Date } {
  const now = new Date();
  if (params.windowMode === "custom" && params.appliedCustom) {
    const start = new Date(params.appliedCustom.startIso);
    const end = new Date(params.appliedCustom.endIso);
    if (
      Number.isFinite(start.getTime()) &&
      Number.isFinite(end.getTime()) &&
      start < end
    ) {
      let s = start;
      let e = end;
      if (e > now) e = now;
      if (e <= s) s = new Date(e.getTime() - 60 * 60 * 1000);
      if (e.getTime() - s.getTime() > MAX_CUSTOM_RANGE_MS) {
        s = new Date(e.getTime() - MAX_CUSTOM_RANGE_MS);
      }
      return { start: s, end: e };
    }
  }
  const h = Math.max(1, params.presetHours);
  return { start: new Date(now.getTime() - h * 3600 * 1000), end: now };
}

export function hoursBetween(start: Date, end: Date): number {
  return Math.max(1 / 60, (end.getTime() - start.getTime()) / (3600 * 1000));
}

export type CorrelationPerfMode = "light" | "full";

export function limitsForCorrelationMode(mode: CorrelationPerfMode) {
  if (mode === "full") {
    return {
      maxHistoriesLoaded: 24,
      historyLimit: 120,
      systemHistoryLimit: 360,
      pointsPerSubchart: 180,
      subChartHeight: 120,
    };
  }
  return {
    maxHistoriesLoaded: 8,
    historyLimit: 90,
    systemHistoryLimit: 180,
    pointsPerSubchart: 160,
    subChartHeight: 102,
  };
}

export function scaledFetchLimits(
  hours: number,
  base: ReturnType<typeof limitsForCorrelationMode>,
) {
  const days = hours / 24;
  const mult = Math.min(40, Math.max(1, Math.ceil(days)));
  return {
    historyLimit: Math.min(12000, Math.floor(base.historyLimit * mult)),
    systemHistoryLimit: Math.min(
      20000,
      Math.floor(base.systemHistoryLimit * mult),
    ),
  };
}
