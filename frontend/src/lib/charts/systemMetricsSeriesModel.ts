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

/** Série réseau telle qu’affichée sur la page Performances (Mo cumulés côté API / agrégateur). */
export type SystemNetworkMbRow = SystemPercentSeriesRow & {
  networkRxMb: number | null
  networkTxMb: number | null
}

export type SystemNetworkMbRateRow = SystemNetworkMbRow & {
  networkRxMbPerMin: number
  networkTxMbPerMin: number
}

/**
 * Débit **Mo/min** à partir des **cumuls** RX/TX (Mo) entre points consécutifs — même idée que le débit Block I/O
 * sur le détail service. Permet de repérer les **pics** d’activité réseau sans se limiter à une courbe monotone.
 */
export function buildSystemNetworkMbRateRows(rows: SystemNetworkMbRow[]): SystemNetworkMbRateRow[] {
  return rows.map((row, i) => {
    if (i === 0) {
      return { ...row, networkRxMbPerMin: 0, networkTxMbPerMin: 0 }
    }
    const prev = rows[i - 1]
    const dtMs = row.timeMs - prev.timeMs
    if (dtMs < 4000 || dtMs > 60 * 60 * 1000) {
      return { ...row, networkRxMbPerMin: 0, networkTxMbPerMin: 0 }
    }
    const dtMin = dtMs / 60000
    const rx0 = prev.networkRxMb
    const rx1 = row.networkRxMb
    const tx0 = prev.networkTxMb
    const tx1 = row.networkTxMb
    let networkRxMbPerMin = 0
    let networkTxMbPerMin = 0
    if (rx0 != null && rx1 != null && Number.isFinite(rx0) && Number.isFinite(rx1)) {
      networkRxMbPerMin = Math.max(0, rx1 - rx0) / dtMin
    }
    if (tx0 != null && tx1 != null && Number.isFinite(tx0) && Number.isFinite(tx1)) {
      networkTxMbPerMin = Math.max(0, tx1 - tx0) / dtMin
    }
    return { ...row, networkRxMbPerMin, networkTxMbPerMin }
  })
}

export function systemNetworkRateAxisMax(rows: SystemNetworkMbRateRow[]): number {
  if (!rows.length) return 1
  const m = Math.max(
    0.001,
    ...rows.map((r) => Math.max(r.networkRxMbPerMin || 0, r.networkTxMbPerMin || 0))
  )
  return m * 1.12 + 0.0005
}
