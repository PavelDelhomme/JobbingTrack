const {
  sanitizeDockerLogsSinceUntil,
  clampDockerLogLines,
  normalizeDockerLogsQuery,
} = require('../src/utils/dockerLogsQuery');

describe('dockerLogsQuery (aligné metrics-aggregator)', () => {
  test('sanitizeDockerLogsSinceUntil accepte fenêtres relatives whitelist', () => {
    expect(sanitizeDockerLogsSinceUntil('1h')).toBe('1h');
    expect(sanitizeDockerLogsSinceUntil('7d')).toBe('7d');
  });

  test('sanitizeDockerLogsSinceUntil accepte ISO Z', () => {
    expect(sanitizeDockerLogsSinceUntil('2026-01-15T12:00:00.000Z')).toBe('2026-01-15T12:00:00.000Z');
  });

  test('sanitizeDockerLogsSinceUntil rejette injection / valeurs arbitraires', () => {
    expect(sanitizeDockerLogsSinceUntil('; rm -rf /')).toBeNull();
    expect(sanitizeDockerLogsSinceUntil('9999h')).toBeNull();
    expect(sanitizeDockerLogsSinceUntil('')).toBeNull();
    expect(sanitizeDockerLogsSinceUntil(null)).toBeNull();
  });

  test('clampDockerLogLines 10–5000', () => {
    expect(clampDockerLogLines(5, 100)).toBe(10);
    expect(clampDockerLogLines(100, 100)).toBe(100);
    expect(clampDockerLogLines(99999, 100)).toBe(5000);
    expect(clampDockerLogLines('nope', 42)).toBe(42);
  });

  test('normalizeDockerLogsQuery produit une query string pour le proxy agrégateur', () => {
    const a = normalizeDockerLogsQuery({ lines: 200, since: '1h', until: '2026-01-01T00:00:00.000Z' });
    expect(a.lines).toBe(200);
    expect(a.since).toBe('1h');
    expect(a.until).toBe('2026-01-01T00:00:00.000Z');
    expect(a.queryString).toContain('lines=200');
    expect(a.queryString).toContain('since=1h');
    expect(a.queryString).toContain('until=');

    const b = normalizeDockerLogsQuery({ lines: 50, since: '; evil', until: undefined });
    expect(b.lines).toBe(50);
    expect(b.since).toBeNull();
    expect(b.until).toBeNull();
    expect(b.queryString).toBe('lines=50');
  });
});
