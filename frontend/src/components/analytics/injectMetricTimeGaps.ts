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
      const prevMs = new Date(rows[i - 1].timestamp).getTime();
      const curMs = new Date(rows[i].timestamp).getTime();
      if (curMs - prevMs > gapThresholdMs) {
        const mid = new Date(Math.floor((prevMs + curMs) / 2)).toISOString();
        const gapRow = { ...rows[i - 1], timestamp: mid } as T;
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
