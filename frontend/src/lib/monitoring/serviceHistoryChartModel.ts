/**
 * Modèle dérivé pour les graphes d’historique service (détail `/backoffice/services/[nom]`).
 * Fonctions pures — réutilisables par d’autres vues monitoring (lot A1) et testables sans React.
 */
import { metricTimestampToMs } from '@/lib/utils/date'
import type { ServiceHistoryPoint } from '@/lib/monitoring/serviceDetailHistory'

export type ServiceHistoryChartRow = ServiceHistoryPoint & { timeMs: number }

export type ServiceHistoryIoRow = ServiceHistoryChartRow & {
  block_read_mb_per_min: number
  block_write_mb_per_min: number
}

export function buildHistoryChartRows(
  serviceHistory: ServiceHistoryPoint[]
): ServiceHistoryChartRow[] {
  return serviceHistory
    .map((row) => {
      const timeMs = metricTimestampToMs(row.timestamp)
      if (timeMs == null || Number.isNaN(timeMs)) return null
      const blockRead = Number(row.block_read_mb)
      const blockWrite = Number(row.block_write_mb)
      return {
        ...row,
        block_read_mb: Number.isFinite(blockRead) ? blockRead : 0,
        block_write_mb: Number.isFinite(blockWrite) ? blockWrite : 0,
        timeMs
      }
    })
    .filter(Boolean) as ServiceHistoryChartRow[]
}

/** Débit Block I/O (Mo/min) à partir des cumuls consécutifs */
export function buildHistoryChartRowsIo(rows: ServiceHistoryChartRow[]): ServiceHistoryIoRow[] {
  return rows.map((row, i) => {
    if (i === 0) {
      return { ...row, block_read_mb_per_min: 0, block_write_mb_per_min: 0 }
    }
    const prev = rows[i - 1]
    const dtMs = row.timeMs - prev.timeMs
    if (dtMs < 4000 || dtMs > 60 * 60 * 1000) {
      return { ...row, block_read_mb_per_min: 0, block_write_mb_per_min: 0 }
    }
    const dtMin = dtMs / 60000
    const dr = Math.max(0, Number(row.block_read_mb) - Number(prev.block_read_mb))
    const dw = Math.max(0, Number(row.block_write_mb) - Number(prev.block_write_mb))
    return {
      ...row,
      block_read_mb_per_min: dr / dtMin,
      block_write_mb_per_min: dw / dtMin
    }
  })
}

export function historyCpuMaxY(serviceHistory: ServiceHistoryPoint[]): number {
  if (!serviceHistory.length) return 1
  const m = Math.max(0.02, ...serviceHistory.map((h) => Number(h.cpu_percent) || 0))
  return Math.min(100, m * 1.2 + 0.05)
}

export function historyMemMaxY(serviceHistory: ServiceHistoryPoint[]): number {
  if (!serviceHistory.length) return 1
  const m = Math.max(0.5, ...serviceHistory.map((h) => Number(h.memory_percent) || 0))
  return Math.min(100, m * 1.15 + 0.5)
}

export function historyAxisShowDateForSpan(rows: ServiceHistoryChartRow[]): boolean {
  if (rows.length < 2) return false
  const span = rows[rows.length - 1].timeMs - rows[0].timeMs
  return span > 24 * 60 * 60 * 1000
}

export function historyBlockMbMaxY(rows: ServiceHistoryChartRow[]): number {
  if (!rows.length) return 1
  const m = Math.max(
    0.05,
    ...rows.map((h) => Math.max(Number(h.block_read_mb) || 0, Number(h.block_write_mb) || 0))
  )
  return m * 1.08 + 0.02
}

export function historyIoRateMaxY(rows: ServiceHistoryIoRow[]): number {
  if (!rows.length) return 1
  const m = Math.max(
    0.01,
    ...rows.map((h) =>
      Math.max(Number(h.block_read_mb_per_min) || 0, Number(h.block_write_mb_per_min) || 0)
    )
  )
  return m * 1.15 + 0.01
}
