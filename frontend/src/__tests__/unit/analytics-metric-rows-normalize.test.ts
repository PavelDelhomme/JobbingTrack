/**
 * Garde-fou : timestamp ISO et timestampMs API doivent représenter le même instant
 * (sinon axes / tooltips peuvent dériver ~2 h selon lequel Recharts / metricRowToTimeMs privilégie).
 */
import { normalizeMetricRows } from '@/lib/api/analytics.service';
import { formatLocalChartAxisTick, metricRowToTimeMs } from '@/lib/utils/date';

describe('normalizeMetricRows (alignement timestamp / timestampMs)', () => {
  const prevTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Paris';
  });

  afterAll(() => {
    process.env.TZ = prevTz;
  });

  it('écrase un timestampMs erroné (+2 h) avec la valeur dérivée du timestamp ISO', () => {
    const iso = '2026-04-07T10:41:00.000Z';
    const wrongMs = Date.parse(iso) + 2 * 60 * 60 * 1000;
    const [row] = normalizeMetricRows([
      { timestamp: iso, timestampMs: wrongMs, cpuUsagePercent: 1 },
    ]);
    expect(row.timestampMs).toBe(Date.parse(iso));
    expect(row.timestamp).toBe(iso);
    const tick = formatLocalChartAxisTick(row.timestampMs as number, { withDate: false });
    expect(tick).toMatch(/12:41/);
  });

  it('metricRowToTimeMs suit le timestampMs aligné (cohérence performances)', () => {
    const iso = '2026-04-07T07:56:00.000Z';
    const [row] = normalizeMetricRows([{ timestamp: iso, cpuUsagePercent: 5 }]);
    const ms = metricRowToTimeMs(row as Record<string, unknown>, String(row.timestamp));
    expect(ms).toBe(Date.parse(iso));
  });
});
