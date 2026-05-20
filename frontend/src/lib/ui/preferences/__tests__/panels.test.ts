import {
  defaultStatisticsPanel,
  mergeStatisticsPanel,
  migrateLegacyPanelStorage,
} from "../panels";

describe("mergeStatisticsPanel", () => {
  it("conserve timeRange par défaut si patch partiel", () => {
    const merged = mergeStatisticsPanel({ showSecurity: false });
    expect(merged.showSecurity).toBe(false);
    expect(merged.timeRange).toBe(defaultStatisticsPanel.timeRange);
  });
});

describe("migrateLegacyPanelStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("importe statistics-customization puis supprime la clé", () => {
    localStorage.setItem(
      "statistics-customization",
      JSON.stringify({ timeRange: "7d", showTimeline: false }),
    );
    const panels = migrateLegacyPanelStorage();
    expect(panels.statistics.timeRange).toBe("7d");
    expect(panels.statistics.showTimeline).toBe(false);
    expect(localStorage.getItem("statistics-customization")).toBeNull();
  });
});
