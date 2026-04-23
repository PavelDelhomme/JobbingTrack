import { historyPointsFromAggregatorChartData } from '@/lib/monitoring/serviceHistorySources'

describe('serviceHistorySources', () => {
  it('historyPointsFromAggregatorChartData retourne [] si pas de chartData', () => {
    expect(historyPointsFromAggregatorChartData(null, 'jobbingtrack-x', 'x')).toEqual([])
    expect(historyPointsFromAggregatorChartData({}, 'jobbingtrack-x', 'x')).toEqual([])
  })

  it('mappe chartData vers ServiceHistoryPoint pour le service trouvé', () => {
    const metrics = {
      chartData: [
        {
          time: '2025-11-04T12:00:00.000Z',
          services: {
            'jobbingtrack-auth-service': {
              cpu: 3.5,
              memory: 22,
              memory_mb: 90,
              network_rx: 1,
              network_tx: 2,
              block_read_mb: 0.1,
              block_write_mb: 0.2,
            },
          },
        },
      ],
      servicesList: [
        {
          rawName: 'jobbingtrack-auth-service',
          name: 'auth-service',
          metrics: { cpu: { percentage: 0 }, memory: { percentage: 0, usageMb: 0 }, network: {} },
        },
      ],
    }
    const pts = historyPointsFromAggregatorChartData(
      metrics,
      'jobbingtrack-auth-service',
      'auth-service',
      80
    )
    expect(pts).toHaveLength(1)
    expect(pts[0].timestamp).toBe('2025-11-04T12:00:00.000Z')
    expect(pts[0].cpu_percent).toBe(3.5)
    expect(pts[0].memory_percent).toBe(22)
    expect(pts[0].block_read_mb).toBe(0.1)
    expect(pts[0].block_write_mb).toBe(0.2)
  })
})
