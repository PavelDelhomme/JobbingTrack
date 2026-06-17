import { normalizeMetricTimestampToIso } from "@/lib/utils/date";

export type LogStatsTimelineRow = {
  timeMs: number;
  timestamp: string;
  count: number;
};

type TimestampedRow = {
  timestamp?: string | Date | null;
};

function rowTimeMs(row: TimestampedRow): number | null {
  const tsIso = normalizeMetricTimestampToIso(row.timestamp);
  if (!tsIso) return null;
  const ms = Date.parse(tsIso);
  return Number.isFinite(ms) ? ms : null;
}

function bucketMs(timeMs: number, bucketMs: number): number {
  return Math.floor(timeMs / bucketMs) * bucketMs;
}

function bucketSizeMs(periodDays: number): number {
  if (periodDays <= 2) return 60 * 60 * 1000;
  if (periodDays <= 14) return 6 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function compressRows<T extends { timeMs: number }>(
  rows: T[],
  maxPoints: number,
): T[] {
  if (rows.length <= maxPoints) return rows;
  const step = Math.ceil(rows.length / maxPoints);
  return rows.filter((_, index) => index % step === 0);
}

/** Compte les logs par bucket temporel sur la fenêtre demandée. */
export function buildLogStatsTimelineRows(
  rows: TimestampedRow[],
  periodDays: number,
  maxPoints = 80,
): LogStatsTimelineRow[] {
  const bucket = bucketSizeMs(periodDays);
  const now = Date.now();
  const rangeStart = now - periodDays * 24 * 60 * 60 * 1000;
  const counts = new Map<number, number>();

  for (const row of rows) {
    const timeMs = rowTimeMs(row);
    if (timeMs == null || timeMs < rangeStart || timeMs > now) continue;
    const key = bucketMs(timeMs, bucket);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timeMs, count]) => ({
      timeMs,
      timestamp: new Date(timeMs).toISOString(),
      count,
    }));

  return compressRows(sorted, maxPoints);
}

export function logStatsSampleRangeLabel(
  rows: TimestampedRow[],
  periodDays: number,
): string | null {
  const now = Date.now();
  const rangeStart = now - periodDays * 24 * 60 * 60 * 1000;
  let minMs: number | null = null;
  let maxMs: number | null = null;

  for (const row of rows) {
    const timeMs = rowTimeMs(row);
    if (timeMs == null || timeMs < rangeStart || timeMs > now) continue;
    if (minMs == null || timeMs < minMs) minMs = timeMs;
    if (maxMs == null || timeMs > maxMs) maxMs = timeMs;
  }

  if (minMs == null || maxMs == null) return null;
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
