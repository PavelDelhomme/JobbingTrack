/**
 * Garde-fou : les timestamps API sont en UTC ; l’UI doit afficher l’heure locale
 * (ne pas afficher la portion « 07:56 » de l’ISO comme si c’était l’heure locale).
 */
import {
  formatLocalChartAxisTick,
  formatLocalDateTime,
  metricRowToTimeMs,
  parseChartTimestamp,
} from '@/lib/utils/date';

describe('Affichage métriques (fuseau local)', () => {
  const prevTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Paris';
  });

  afterAll(() => {
    process.env.TZ = prevTz;
  });

  it('formatLocalDateTime : UTC → heure locale (CEST avril)', () => {
    expect(formatLocalDateTime('2026-04-07T07:56:00.000Z')).toMatch(/09:56/);
  });

  it('parseChartTimestamp accepte une chaîne numérique d’epoch ms (Recharts)', () => {
    const ms = Date.parse('2026-04-07T07:56:00.000Z');
    const d = parseChartTimestamp(String(ms));
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(ms);
  });

  it('formatLocalChartAxisTick : nombre ms → heure locale', () => {
    const ms = Date.parse('2026-04-07T07:56:00.000Z');
    expect(formatLocalChartAxisTick(ms, { withDate: false })).toMatch(/09:56/);
  });

  it('parseChartTimestamp : objet Recharts { value: ms en chaîne }', () => {
    const ms = Date.parse('2026-04-07T07:56:00.000Z');
    const d = parseChartTimestamp({ value: String(ms) });
    expect(d?.getTime()).toBe(ms);
  });

  it('metricRowToTimeMs préfère timestampMs API', () => {
    const ms = Date.parse('2026-04-07T07:56:00.000Z');
    const row = { timestampMs: ms, timestamp: 'ignored-if-ms-set' };
    expect(metricRowToTimeMs(row, '')).toBe(ms);
  });
});
