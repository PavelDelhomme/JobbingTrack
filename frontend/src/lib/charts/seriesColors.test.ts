import {
  BACKOFFICE_SERIES_COLORS,
  buildStableSeriesColorMap,
} from "./seriesColors";

describe("buildStableSeriesColorMap", () => {
  it("attribue une couleur unique à chaque série visible", () => {
    const keys = Array.from(
      { length: BACKOFFICE_SERIES_COLORS.length + 10 },
      (_, index) => `jobbingtrack-service-${index}`,
    );

    const colorMap = buildStableSeriesColorMap(keys);
    const colors = Object.values(colorMap);

    expect(colors).toHaveLength(keys.length);
    expect(new Set(colors).size).toBe(keys.length);
  });

  it("reste stable quel que soit l’ordre des séries reçues", () => {
    const keys = ["api-gateway", "metrics-aggregator", "frontend", "postgres"];
    const reversed = [...keys].reverse();

    expect(buildStableSeriesColorMap(keys)).toEqual(
      buildStableSeriesColorMap(reversed),
    );
  });
});

