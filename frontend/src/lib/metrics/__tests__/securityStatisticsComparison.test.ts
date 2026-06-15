import { buildSecurityConsistencySummary } from "../securityStatisticsComparison";

describe("securityStatisticsComparison", () => {
  it("marque critique quand /security live expose des incidents récents", () => {
    const summary = buildSecurityConsistencySummary(
      {
        avgSecurityScore: 99.1,
        dataPoints: 2000,
        totalSuspiciousActivities: 717,
        totalSecurityAlerts: 478,
      },
      {
        overview: {
          totalLogs: 1000,
          criticalEvents: 4,
          intrusionAttempts: 4,
          ddosAttacks: 258,
          securityScore: 0,
        },
      },
    );

    expect(summary.level).toBe("critical");
    expect(summary.persistedScore).toBe(99.1);
    expect(summary.liveScore).toBe(0);
    expect(summary.liveEvents).toBe(266);
    expect(summary.message).toContain("Incidents live récents");
  });

  it("reste en surveillance si les fenêtres contiennent seulement des signaux non critiques", () => {
    const summary = buildSecurityConsistencySummary(
      {
        avgSecurityScore: "84.5",
        dataPoints: "120",
        totalSuspiciousActivities: "3",
      },
      {
        overview: {
          totalLogs: 25,
          criticalEvents: 0,
          intrusionAttempts: 1,
          ddosAttacks: 0,
          securityScore: 82,
        },
      },
    );

    expect(summary.level).toBe("watch");
    expect(summary.persistedDataPoints).toBe(120);
    expect(summary.persistedEvents).toBe(3);
    expect(summary.liveEvents).toBe(1);
  });

  it("signale le blocage si la console live est indisponible", () => {
    const summary = buildSecurityConsistencySummary(
      { avgSecurityScore: 100, dataPoints: 0 },
      null,
    );

    expect(summary.level).toBe("critical");
    expect(summary.liveScore).toBeNull();
    expect(summary.message).toContain("Console Sécurité live indisponible");
  });
});
