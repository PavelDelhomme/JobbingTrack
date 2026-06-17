import {
  buildComparisonChartData,
  summarizeContainerWindow,
} from "./correlationContainerMetrics";

describe("correlationContainerMetrics", () => {
  it("résume les pics CPU/mémoire et deltas cumulés", () => {
    const summary = summarizeContainerWindow([
      {
        timeMs: 0,
        timestamp: "2026-01-01T00:00:00.000Z",
        cpu: 10,
        memory: 20,
        networkRxMb: 100,
        networkTxMb: 50,
        ioReadMb: 1000,
        ioWriteMb: 200,
      },
      {
        timeMs: 60_000,
        timestamp: "2026-01-01T00:01:00.000Z",
        cpu: 85,
        memory: 72,
        networkRxMb: 106,
        networkTxMb: 52,
        ioReadMb: 1010,
        ioWriteMb: 205,
      },
    ]);
    expect(summary?.cpuMax).toBe(85);
    expect(summary?.memMax).toBe(72);
    expect(summary?.cpuPeakTimeMs).toBe(60_000);
    expect(summary?.netDeltaMb).toBeCloseTo(8, 5);
    expect(summary?.ioDeltaMb).toBeCloseTo(15, 5);
  });

  it("superpose plusieurs conteneurs sur une timeline commune", () => {
    const { rows, seriesKeys } = buildComparisonChartData(
      {
        "jobbingtrack-postgres": [
          {
            timeMs: 1000,
            timestamp: "t1",
            cpu: 40,
            memory: 30,
            networkRxMb: null,
            networkTxMb: null,
            ioReadMb: null,
            ioWriteMb: null,
            system_cpu: null,
            system_memory: null,
            responseTimeMs: null,
          },
        ],
        "jobbingtrack-frontend": [
          {
            timeMs: 1000,
            timestamp: "t1",
            cpu: 90,
            memory: 66,
            networkRxMb: null,
            networkTxMb: null,
            ioReadMb: null,
            ioWriteMb: null,
            system_cpu: null,
            system_memory: null,
            responseTimeMs: null,
          },
        ],
      },
      "cpu",
      10,
      5000,
    );
    expect(seriesKeys).toEqual(["postgres", "frontend"]);
    expect(rows[0].postgres).toBe(40);
    expect(rows[0].frontend).toBe(90);
  });
});
