import {
  buildSystemNetworkMbRateRows,
  filterSystemPercentRows,
  resolveMemoryUsagePercent,
  sanitizeSystemPercent,
  systemCpuAxisMax,
  systemMemoryAxisMax,
  systemNetworkRateAxisMax,
  type SystemNetworkMbRow,
  type SystemPercentSeriesRow,
} from "@/lib/charts/systemMetricsSeriesModel";

describe("systemMetricsSeriesModel", () => {
  const rows: SystemPercentSeriesRow[] = [
    { timeMs: 1, timestamp: "2025-01-01T00:00:00.000Z", cpu: 0.5, memory: 10 },
    { timeMs: 2, timestamp: "2025-01-01T00:01:00.000Z", cpu: 1.2, memory: 42 },
  ];

  it("systemCpuAxisMax borne sous 100 et zoom si charge faible", () => {
    expect(systemCpuAxisMax(rows)).toBeLessThanOrEqual(100);
    expect(systemCpuAxisMax(rows)).toBeGreaterThan(1.2);
    expect(systemCpuAxisMax([])).toBe(1);
  });

  it("systemMemoryAxisMax borne sous 100", () => {
    expect(systemMemoryAxisMax(rows)).toBeLessThanOrEqual(100);
    expect(systemMemoryAxisMax([])).toBe(1);
  });

  it("filterSystemPercentRows retire timeMs non fini", () => {
    const mixed: SystemPercentSeriesRow[] = [
      ...rows,
      { timeMs: NaN, timestamp: "", cpu: 0, memory: 0 },
    ];
    expect(filterSystemPercentRows(mixed)).toHaveLength(2);
  });

  it("sanitizeSystemPercent rejette Mo/octets déguisés en %", () => {
    expect(sanitizeSystemPercent(46.4)).toBe(46.4);
    expect(sanitizeSystemPercent(2995632)).toBeNull();
    expect(sanitizeSystemPercent(-1)).toBeNull();
    expect(sanitizeSystemPercent(NaN)).toBeNull();
  });

  it("resolveMemoryUsagePercent recalcule depuis octets si % absurde", () => {
    expect(
      resolveMemoryUsagePercent({
        percent: 2995632,
        usedBytes: 21.8 * 1024 ** 3,
        totalBytes: 46.9 * 1024 ** 3,
      }),
    ).toBeCloseTo(46.48, 1);
    expect(resolveMemoryUsagePercent({ percent: 21.8 })).toBe(21.8);
  });

  it("filterSystemPercentRows sanitise cpu/mémoire > 100", () => {
    const mixed: SystemPercentSeriesRow[] = [
      ...rows,
      {
        timeMs: 3,
        timestamp: "x",
        cpu: 2_995_632,
        memory: 50_000,
      },
    ];
    const filtered = filterSystemPercentRows(mixed);
    expect(filtered).toHaveLength(3);
    expect(filtered[2].cpu).toBeNull();
    expect(filtered[2].memory).toBeNull();
    expect(systemCpuAxisMax(filtered)).toBeLessThanOrEqual(100);
    expect(systemMemoryAxisMax(filtered)).toBeLessThanOrEqual(100);
  });

  it("buildSystemNetworkMbRateRows calcule Mo/min sur 1 minute", () => {
    const net: SystemNetworkMbRow[] = [
      {
        timeMs: 0,
        timestamp: "a",
        cpu: null,
        memory: null,
        networkRxMb: 10,
        networkTxMb: 5,
      },
      {
        timeMs: 60_000,
        timestamp: "b",
        cpu: null,
        memory: null,
        networkRxMb: 12,
        networkTxMb: 7,
      },
    ];
    const r = buildSystemNetworkMbRateRows(net);
    expect(r[1].networkRxMbPerMin).toBeCloseTo(2, 5);
    expect(r[1].networkTxMbPerMin).toBeCloseTo(2, 5);
    expect(systemNetworkRateAxisMax(r)).toBeGreaterThan(2);
  });
});
