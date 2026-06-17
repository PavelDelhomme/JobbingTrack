import { injectMetricTimeGaps } from "@/components/analytics/injectMetricTimeGaps";
import { metricTimestampToMs } from "@/lib/utils/date";

export const STATISTICS_METRIC_GAP_MS = 15 * 60 * 1000;

export type StatisticsHistorySource = "system_metrics" | "snapshots" | "empty";

export interface MetricsHistoryRow {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  network_rx_mb: number;
  network_tx_mb: number;
  response_time_avg: number;
  error_count: number;
  error_rate: number;
  availability_percent: number;
  load_score: number;
  containers_count: number;
  services_healthy: number;
  services_degraded: number;
  services_offline: number;
  /** Vrai si error_rate est dérivé (pas de colonne dédiée en BDD). */
  error_rate_derived?: boolean;
}

/** Dérive un indicateur d’erreur / indisponibilité quand error_rate n’est pas persisté. */
export function deriveErrorRatePercent(item: Record<string, unknown>): {
  value: number;
  derived: boolean;
} {
  const explicit = item.errorRate ?? item.error_rate;
  if (explicit != null && Number.isFinite(Number(explicit))) {
    return { value: Number(explicit), derived: false };
  }
  const avail = item.availabilityPercent ?? item.availability_percent;
  if (avail != null && Number.isFinite(Number(avail))) {
    return {
      value: Math.max(0, Math.min(100, 100 - Number(avail))),
      derived: true,
    };
  }
  const load = item.loadScore ?? item.load_score;
  if (load != null && Number.isFinite(Number(load))) {
    return {
      value: Math.max(0, Math.min(100, 100 - Number(load))),
      derived: true,
    };
  }
  return { value: 0, derived: true };
}

export interface StatisticsChartPoint {
  time: string;
  timeMs: number;
  cpu: number;
  memory: number;
  networkRx: number;
  networkTx: number;
  responseTime: number;
  errorRate: number;
  availability: number;
  loadScore: number;
  errorRateDerived?: boolean;
}

export function buildStatisticsChartData(
  history: MetricsHistoryRow[],
  formatTime: (timestamp: string) => string,
  options?: { maxPoints?: number; gapMs?: number },
): StatisticsChartPoint[] {
  if (!history.length) return [];

  const gapMs = options?.gapMs ?? STATISTICS_METRIC_GAP_MS;
  const sorted = [...history].sort(
    (a, b) =>
      (metricTimestampToMs(a.timestamp) ?? 0) -
      (metricTimestampToMs(b.timestamp) ?? 0),
  );

  const maxPoints = options?.maxPoints ?? sorted.length;
  let dataToUse = sorted;
  if (sorted.length > maxPoints) {
    const step = Math.ceil(sorted.length / maxPoints);
    dataToUse = sorted.filter((_, index) => index % step === 0);
  }

  const rows = dataToUse.map((item) => {
    const timeMs = metricTimestampToMs(item.timestamp) ?? Date.now();
    return {
      timestamp: item.timestamp,
      timeMs,
      cpu: item.cpu_percent,
      memory: item.memory_percent,
      networkRx: item.network_rx_mb,
      networkTx: item.network_tx_mb,
      responseTime: item.response_time_avg,
      errorRate: item.error_rate,
      availability: item.availability_percent,
      loadScore: item.load_score,
      errorRateDerived: item.error_rate_derived,
    };
  });

  const withGaps = injectMetricTimeGaps(rows, gapMs, [
    "cpu",
    "memory",
    "networkRx",
    "networkTx",
    "responseTime",
    "errorRate",
    "availability",
    "loadScore",
  ]);

  return withGaps.map((item) => ({
    time: formatTime(item.timestamp),
    timeMs: item.timeMs,
    cpu: item.cpu,
    memory: item.memory,
    networkRx: item.networkRx,
    networkTx: item.networkTx,
    responseTime: item.responseTime,
    errorRate: item.errorRate,
    availability: item.availability,
    loadScore: item.loadScore,
    errorRateDerived: item.errorRateDerived,
  }));
}

export function availabilityChartDomain(
  points: StatisticsChartPoint[],
): [number, number] {
  const vals = points
    .map((p) => p.availability)
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return [0, 100];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(2, (max - min) * 0.1);
  return [
    Math.max(0, Math.floor(min - pad)),
    Math.min(100, Math.ceil(max + pad)),
  ];
}

const SOURCE_LABELS: Record<StatisticsHistorySource, string> = {
  system_metrics: "Persistance system_metrics",
  snapshots: "Snapshots conteneurs",
  empty: "Aucune série",
};

export function statisticsHistorySourceLabel(
  source: StatisticsHistorySource,
): string {
  return SOURCE_LABELS[source];
}

/** Plage réelle des points rendus, avec repli sur le libellé de période sticky. */
export function statisticsSampleRangeLabel(
  points: Array<{ timeMs: number }>,
  fallbackLabel: string,
): string {
  if (points.length === 0) return fallbackLabel;
  let minMs: number | null = null;
  let maxMs: number | null = null;
  for (const point of points) {
    if (!Number.isFinite(point.timeMs)) continue;
    if (minMs == null || point.timeMs < minMs) minMs = point.timeMs;
    if (maxMs == null || point.timeMs > maxMs) maxMs = point.timeMs;
  }
  if (minMs == null || maxMs == null) return fallbackLabel;
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(minMs)} → ${fmt(maxMs)}`;
}
