import {
  historyPointsFromAggregatorChartData,
  loadServerHistoryPoints,
} from "@/lib/monitoring/serviceHistorySources";

describe("serviceHistorySources", () => {
  it("historyPointsFromAggregatorChartData retourne [] si pas de chartData", () => {
    expect(
      historyPointsFromAggregatorChartData(null, "jobbingtrack-x", "x"),
    ).toEqual([]);
    expect(
      historyPointsFromAggregatorChartData({}, "jobbingtrack-x", "x"),
    ).toEqual([]);
  });

  it("mappe chartData vers ServiceHistoryPoint pour le service trouvé", () => {
    const metrics = {
      chartData: [
        {
          time: "2025-11-04T12:00:00.000Z",
          services: {
            "jobbingtrack-auth-service": {
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
          rawName: "jobbingtrack-auth-service",
          name: "auth-service",
          metrics: {
            cpu: { percentage: 0 },
            memory: { percentage: 0, usageMb: 0 },
            network: {},
          },
        },
      ],
    };
    const pts = historyPointsFromAggregatorChartData(
      metrics,
      "jobbingtrack-auth-service",
      "auth-service",
      80,
    );
    expect(pts).toHaveLength(1);
    expect(pts[0].timestamp).toBe("2025-11-04T12:00:00.000Z");
    expect(pts[0].cpu_percent).toBe(3.5);
    expect(pts[0].memory_percent).toBe(22);
    expect(pts[0].block_read_mb).toBe(0.1);
    expect(pts[0].block_write_mb).toBe(0.2);
  });

  it("borne explicitement la fenêtre /history jusqu'au refresh courant", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            timestamp: "2026-06-16T14:45:00.000Z",
            cpu_percent: 1.2,
            memory_percent: 18,
          },
        ],
      }),
    });
    const previousFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const nowMs = Date.parse("2026-06-16T15:10:00.000Z");
      const points = await loadServerHistoryPoints({
        metricsUrl: "http://metrics.local",
        fullServiceName: "jobbingtrack-auth-service",
        serviceName: "auth-service",
        historyLimit: 320,
        historyWindowMs: 6 * 60 * 60 * 1000,
        nowMs,
      });

      expect(points).toHaveLength(1);
      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.pathname).toBe(
        "/api/v1/docker/service/jobbingtrack-auth-service/history",
      );
      expect(url.searchParams.get("limit")).toBe("320");
      expect(url.searchParams.get("endTime")).toBe(String(nowMs));
      expect(url.searchParams.get("startTime")).toBe(
        String(nowMs - 6 * 60 * 60 * 1000),
      );
      expect(url.searchParams.get("_")).toBe(String(nowMs));
      expect(fetchMock.mock.calls[0][1]).toEqual({ cache: "no-store" });
    } finally {
      global.fetch = previousFetch;
    }
  });
});
