/**
 * Normalisation des points d’historique métriques conteneur (agrégateur
 * `/api/v1/docker/service/:name/history` : fichiers + BDD) — réutilisable
 * depuis d’autres vues monitoring (lot A1).
 */
import {
  metricTimestampToMs,
  normalizeMetricTimestampToIso,
  parseChartTimestamp,
} from "@/lib/utils/date";

export type ServiceHistoryPoint = {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_usage_mb: number;
  network_rx_mb: number;
  network_tx_mb: number;
  /** Cumuls Docker Block I/O (MB) — snapshots `/history` */
  block_read_mb: number;
  block_write_mb: number;
};

export function normalizeServerHistoryRows(
  rows: unknown[],
): ServiceHistoryPoint[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((raw: any) => {
      const fromUnix =
        raw.unix_timestamp != null && raw.unix_timestamp !== ""
          ? (parseChartTimestamp(raw.unix_timestamp)?.toISOString() ?? null)
          : null;
      const tsRaw =
        raw.timestamp != null && String(raw.timestamp).trim() !== ""
          ? raw.timestamp
          : fromUnix;
      if (!tsRaw) return null;
      const ts = normalizeMetricTimestampToIso(
        typeof tsRaw === "string" ? tsRaw : new Date(tsRaw).toISOString(),
      );
      if (!ts) return null;
      return {
        timestamp: ts,
        cpu_percent:
          Number(raw.cpu_percent ?? raw.metrics?.cpu?.percentage ?? 0) || 0,
        memory_percent:
          Number(raw.memory_percent ?? raw.metrics?.memory?.percentage ?? 0) ||
          0,
        memory_usage_mb: Number(raw.memory_usage_mb ?? 0) || 0,
        network_rx_mb: Number(raw.network_rx_mb ?? raw.network_rx ?? 0) || 0,
        network_tx_mb: Number(raw.network_tx_mb ?? raw.network_tx ?? 0) || 0,
        block_read_mb: Number(raw.block_read_mb ?? raw.block_read ?? 0) || 0,
        block_write_mb: Number(raw.block_write_mb ?? raw.block_write ?? 0) || 0,
      };
    })
    .filter(Boolean) as ServiceHistoryPoint[];
}

export function mergeHistoryChronological(
  server: ServiceHistoryPoint[],
  session: ServiceHistoryPoint[],
  maxPoints = 320,
): ServiceHistoryPoint[] {
  const all = [...server, ...session]
    .filter((r) => r?.timestamp)
    .map((r) => ({
      ...r,
      _t: metricTimestampToMs(r.timestamp) ?? 0,
    }))
    .filter((r) => !Number.isNaN(r._t))
    .sort((a, b) => a._t - b._t);
  const out: ServiceHistoryPoint[] = [];
  let lastBucket = -Infinity;
  for (const row of all) {
    const bucket = Math.floor(row._t / 2000);
    if (out.length && bucket === lastBucket) {
      const { _t, ...rest } = row;
      out[out.length - 1] = rest as ServiceHistoryPoint;
    } else {
      const { _t, ...rest } = row;
      out.push(rest as ServiceHistoryPoint);
      lastBucket = bucket;
    }
  }
  return out.slice(-maxPoints);
}
