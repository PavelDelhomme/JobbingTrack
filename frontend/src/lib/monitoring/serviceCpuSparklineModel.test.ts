import {
  buildCpuSparklinePolyline,
  normalizeServiceCpuHistoryRows,
} from "./serviceCpuSparklineModel";

describe("serviceCpuSparklineModel", () => {
  it("normalise les points CPU historiques issus de l'agrégateur", () => {
    expect(
      normalizeServiceCpuHistoryRows([
        { timestamp: "2026-06-15T10:00:00Z", cpu_percent: "4.5" },
        { timestamp: "2026-06-15T10:01:00Z", cpuUsagePercent: 8 },
        { timestamp: "bad", cpu_percent: "NaN" },
        { timestamp: 123, cpu_percent: 5 },
      ]),
    ).toEqual([
      { timestamp: "2026-06-15T10:00:00Z", cpuPercent: 4.5 },
      { timestamp: "2026-06-15T10:01:00Z", cpuPercent: 8 },
    ]);
  });

  it("sous-échantillonne en conservant une tendance moyenne", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      timestamp: `2026-06-15T10:${String(index).padStart(2, "0")}:00Z`,
      cpu_percent: index,
    }));

    expect(normalizeServiceCpuHistoryRows(rows, 5)).toHaveLength(5);
  });

  it("construit une polyline SVG pour la mini-série", () => {
    expect(
      buildCpuSparklinePolyline(
        [
          { timestamp: "a", cpuPercent: 0 },
          { timestamp: "b", cpuPercent: 50 },
          { timestamp: "c", cpuPercent: 100 },
        ],
        40,
        12,
      ),
    ).toBe("0.00,12.00 20.00,6.00 40.00,0.00");
  });
});
