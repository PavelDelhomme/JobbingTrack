/**
 * Dérivés d’axes pour les séries **CPU / mémoire %** (métriques système & conteneurs),
 * alignés sur la logique de `serviceHistoryChartModel` (détail service).
 */
export type SystemPercentSeriesRow = {
  timeMs: number
  timestamp: string
  cpu: number | null
  memory: number | null
}

export function systemCpuAxisMax(rows: SystemPercentSeriesRow[]): number {
  if (!rows.length) return 1
  const m = Math.max(
    0.02,
    ...rows.map((r) => (typeof r.cpu === 'number' && !Number.isNaN(r.cpu) ? r.cpu : 0))
  )
  return Math.min(100, m * 1.2 + 0.05)
}

export function systemMemoryAxisMax(rows: SystemPercentSeriesRow[]): number {
  if (!rows.length) return 1
  const m = Math.max(
    0.5,
    ...rows.map((r) => (typeof r.memory === 'number' && !Number.isNaN(r.memory) ? r.memory : 0))
  )
  return Math.min(100, m * 1.15 + 0.5)
}

/** Lignes utilisables par Recharts (timeMs fini). */
export function filterSystemPercentRows(
  rows: SystemPercentSeriesRow[]
): SystemPercentSeriesRow[] {
  return rows.filter((r) => Number.isFinite(r.timeMs))
}
