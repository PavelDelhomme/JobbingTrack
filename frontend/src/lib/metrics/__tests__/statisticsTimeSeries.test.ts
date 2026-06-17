import {
  availabilityChartDomain,
  buildStatisticsChartData,
  deriveErrorRatePercent,
  statisticsSampleRangeLabel,
} from "../statisticsTimeSeries";

describe("statisticsTimeSeries", () => {
  it("dérive le taux d'erreur depuis la disponibilité", () => {
    expect(deriveErrorRatePercent({ availability_percent: 92 }).value).toBe(8);
    expect(deriveErrorRatePercent({ availability_percent: 92 }).derived).toBe(
      true,
    );
  });

  it("construit des points de graphe ordonnés", () => {
    const points = buildStatisticsChartData(
      [
        {
          timestamp: "2026-05-18T10:00:00.000Z",
          cpu_percent: 1,
          memory_percent: 2,
          network_rx_mb: 0,
          network_tx_mb: 0,
          response_time_avg: 0,
          error_count: 0,
          error_rate: 5,
          availability_percent: 95,
          load_score: 90,
          containers_count: 1,
          services_healthy: 1,
          services_degraded: 0,
          services_offline: 0,
        },
        {
          timestamp: "2026-05-18T11:00:00.000Z",
          cpu_percent: 2,
          memory_percent: 3,
          network_rx_mb: 0,
          network_tx_mb: 0,
          response_time_avg: 0,
          error_count: 0,
          error_rate: 3,
          availability_percent: 97,
          load_score: 92,
          containers_count: 1,
          services_healthy: 1,
          services_degraded: 0,
          services_offline: 0,
        },
      ],
      () => "10h",
      { maxPoints: 100, gapMs: 999999999 },
    );
    expect(points).toHaveLength(2);
    expect(points[0].errorRate).toBe(5);
    expect(points[1].availability).toBe(97);
  });

  it("calcule un domaine Y dynamique pour la disponibilité", () => {
    const domain = availabilityChartDomain([
      {
        time: "a",
        timeMs: 1,
        cpu: 0,
        memory: 0,
        networkRx: 0,
        networkTx: 0,
        responseTime: 0,
        errorRate: 0,
        availability: 88,
        loadScore: 0,
      },
      {
        time: "b",
        timeMs: 2,
        cpu: 0,
        memory: 0,
        networkRx: 0,
        networkTx: 0,
        responseTime: 0,
        errorRate: 0,
        availability: 96,
        loadScore: 0,
      },
    ]);
    expect(domain[0]).toBeLessThan(88);
    expect(domain[1]).toBeGreaterThan(96);
  });

  it("formate une plage d’échantillon avec repli", () => {
    const label = statisticsSampleRangeLabel(
      [
        { timeMs: Date.parse("2026-06-17T10:00:00.000Z") },
        { timeMs: Date.parse("2026-06-17T12:00:00.000Z") },
      ],
      "7 jours",
    );
    expect(label).toMatch(/→/);
    expect(statisticsSampleRangeLabel([], "24 h")).toBe("24 h");
  });
});
