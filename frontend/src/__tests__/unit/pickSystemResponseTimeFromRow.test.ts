import { pickSystemResponseTimeAvgMsFromRow } from '@/lib/metrics/pickSystemResponseTimeFromRow'

describe('pickSystemResponseTimeAvgMsFromRow', () => {
  it('lit responseTimeAvg (API persistance courante)', () => {
    expect(pickSystemResponseTimeAvgMsFromRow({ responseTimeAvg: 42.5 })).toBe(42.5)
  })

  it('lit avg_response_time_ms', () => {
    expect(pickSystemResponseTimeAvgMsFromRow({ avg_response_time_ms: 12 })).toBe(12)
  })

  it('lit response_time_avg (stats globales)', () => {
    expect(pickSystemResponseTimeAvgMsFromRow({ response_time_avg: 99 })).toBe(99)
  })

  it('retourne null si absent ou non numérique', () => {
    expect(pickSystemResponseTimeAvgMsFromRow({})).toBeNull()
    expect(pickSystemResponseTimeAvgMsFromRow({ responseTimeAvg: 'x' })).toBeNull()
    expect(pickSystemResponseTimeAvgMsFromRow({ responseTimeAvg: NaN })).toBeNull()
  })
})
