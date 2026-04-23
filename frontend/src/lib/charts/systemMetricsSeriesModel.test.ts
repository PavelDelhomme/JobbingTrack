import {
  filterSystemPercentRows,
  systemCpuAxisMax,
  systemMemoryAxisMax,
  type SystemPercentSeriesRow,
} from '@/lib/charts/systemMetricsSeriesModel'

describe('systemMetricsSeriesModel', () => {
  const rows: SystemPercentSeriesRow[] = [
    { timeMs: 1, timestamp: '2025-01-01T00:00:00.000Z', cpu: 0.5, memory: 10 },
    { timeMs: 2, timestamp: '2025-01-01T00:01:00.000Z', cpu: 1.2, memory: 42 },
  ]

  it('systemCpuAxisMax borne sous 100 et zoom si charge faible', () => {
    expect(systemCpuAxisMax(rows)).toBeLessThanOrEqual(100)
    expect(systemCpuAxisMax(rows)).toBeGreaterThan(1.2)
    expect(systemCpuAxisMax([])).toBe(1)
  })

  it('systemMemoryAxisMax borne sous 100', () => {
    expect(systemMemoryAxisMax(rows)).toBeLessThanOrEqual(100)
    expect(systemMemoryAxisMax([])).toBe(1)
  })

  it('filterSystemPercentRows retire timeMs non fini', () => {
    const mixed: SystemPercentSeriesRow[] = [
      ...rows,
      { timeMs: NaN, timestamp: '', cpu: 0, memory: 0 },
    ]
    expect(filterSystemPercentRows(mixed)).toHaveLength(2)
  })
})
