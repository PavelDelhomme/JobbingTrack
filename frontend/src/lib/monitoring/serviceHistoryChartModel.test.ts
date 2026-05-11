import {
  buildHistoryChartRows,
  buildHistoryChartRowsIo,
  historyAxisShowDateForSpan,
  historyBlockMbMaxY,
  historyCpuMaxY,
  historyIoRateMaxY,
  historyMemMaxY,
} from '@/lib/monitoring/serviceHistoryChartModel'
import type { ServiceHistoryPoint } from '@/lib/monitoring/serviceDetailHistory'

describe('serviceHistoryChartModel', () => {
  const base: ServiceHistoryPoint[] = [
    {
      timestamp: '2025-11-04T10:00:00.000Z',
      cpu_percent: 1.2,
      memory_percent: 40,
      memory_usage_mb: 100,
      network_rx_mb: 1,
      network_tx_mb: 2,
      block_read_mb: 10,
      block_write_mb: 5,
    },
    {
      timestamp: '2025-11-04T10:01:00.000Z',
      cpu_percent: 2,
      memory_percent: 41,
      memory_usage_mb: 101,
      network_rx_mb: 1.1,
      network_tx_mb: 2.1,
      block_read_mb: 12,
      block_write_mb: 6,
    },
  ]

  it('buildHistoryChartRows ajoute timeMs et filtre timestamps invalides', () => {
    const rows = buildHistoryChartRows([
      ...base,
      { ...base[0], timestamp: 'invalid' },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].timeMs).toBeGreaterThan(0)
    expect(rows[0].block_read_mb).toBe(10)
  })

  it('buildHistoryChartRowsIo calcule un débit sur 1 minute', () => {
    const chart = buildHistoryChartRows(base)
    const io = buildHistoryChartRowsIo(chart)
    expect(io[0].block_read_mb_per_min).toBe(0)
    expect(io[0].block_write_mb_per_min).toBe(0)
    // Δread = 2 MB en 60 s → 2 MB/min
    expect(io[1].block_read_mb_per_min).toBeCloseTo(2, 5)
    expect(io[1].block_write_mb_per_min).toBeCloseTo(1, 5)
  })

  it('historyCpuMaxY et historyMemMaxY restent bornés', () => {
    expect(historyCpuMaxY(base)).toBeLessThanOrEqual(100)
    expect(historyMemMaxY(base)).toBeLessThanOrEqual(100)
    expect(historyCpuMaxY([])).toBe(1)
    expect(historyMemMaxY([])).toBe(1)
  })

  it('historyAxisShowDateForSpan détecte > 24 h', () => {
    const long: ServiceHistoryPoint[] = [
      { ...base[0], timestamp: '2025-11-04T00:00:00.000Z' },
      { ...base[1], timestamp: '2025-11-06T00:00:00.000Z' },
    ]
    const rows = buildHistoryChartRows(long)
    expect(historyAxisShowDateForSpan(rows)).toBe(true)
    expect(historyAxisShowDateForSpan(buildHistoryChartRows(base))).toBe(false)
  })

  it('historyBlockMbMaxY et historyIoRateMaxY', () => {
    const chart = buildHistoryChartRows(base)
    const io = buildHistoryChartRowsIo(chart)
    expect(historyBlockMbMaxY(chart)).toBeGreaterThan(12)
    expect(historyIoRateMaxY(io)).toBeGreaterThan(0)
  })
})
