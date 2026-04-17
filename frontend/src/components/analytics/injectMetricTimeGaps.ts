import { metricTimestampToMs } from '@/lib/utils/date';

function rowEpochMs(row: { timestamp: string }): number | null {
  const tm = (row as { timeMs?: number }).timeMs;
  if (typeof tm === 'number' && Number.isFinite(tm)) return tm;
  return metricTimestampToMs(row.timestamp);
}

/**
 * Insère un point « pont » avec valeurs indéfinies entre deux mesures trop espacées,
 * pour que Recharts (`connectNulls={false}`) trace une coupure au lieu d’une ligne trompeuse.
 */
export function injectMetricTimeGaps<T extends { timestamp: string }>(
  rows: T[],
  gapThresholdMs: number,
  numericKeys: (keyof T)[]
): T[] {
  if (rows.length < 2) return rows;
  const out: T[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) {
      const prevMs = rowEpochMs(rows[i - 1]);
      const curMs = rowEpochMs(rows[i]);
      if (
        prevMs != null &&
        curMs != null &&
        curMs - prevMs > gapThresholdMs
      ) {
        const midMs = Math.floor((prevMs + curMs) / 2);
        const mid = new Date(midMs).toISOString();
        const gapRow = { ...rows[i - 1], timestamp: mid, timeMs: midMs } as T;
        numericKeys.forEach((k) => {
          (gapRow as Record<string, unknown>)[String(k)] = undefined;
        });
        out.push(gapRow);
      }
    }
    out.push(rows[i]);
  }
  return out;
}
