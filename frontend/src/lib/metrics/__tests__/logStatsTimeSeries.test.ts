import {
  buildLogStatsTimelineRows,
  logStatsSampleRangeLabel,
} from "../logStatsTimeSeries";

describe("logStatsTimeSeries", () => {
  const base = Date.parse("2026-06-17T12:00:00.000Z");

  it("agrège les logs par bucket temporel", () => {
    const rows = [
      { timestamp: new Date(base).toISOString() },
      { timestamp: new Date(base + 30 * 60 * 1000).toISOString() },
      { timestamp: new Date(base + 90 * 60 * 1000).toISOString() },
    ];
    const timeline = buildLogStatsTimelineRows(rows, 1, 80);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.reduce((sum, row) => sum + row.count, 0)).toBe(3);
  });

  it("formate une plage d’échantillon", () => {
    const rows = [
      { timestamp: new Date(base).toISOString() },
      { timestamp: new Date(base + 3600_000).toISOString() },
    ];
    const label = logStatsSampleRangeLabel(rows, 1);
    expect(label).toMatch(/→/);
  });
});
