import {
  buildSecurityAnalysisSummary,
  buildSecurityRecommendations,
} from "./securityAnalysisSummary";

describe("securityAnalysisSummary", () => {
  it("utilise le total paginé firewall pour les IPs bloquées", () => {
    const summary = buildSecurityAnalysisSummary({
      stats: { overview: { riskScore: 42 } },
      blockedRaw: [{ ip: "203.0.113.1" }],
      blockedIpsMeta: {
        count: 5,
        pagination: { page: 1, limit: 10, total: 5, pages: 1 },
      },
      logs: [],
      threats: [],
    });

    expect(summary.uniqueBlockedIPs).toBe(5);
    expect(summary.securityScore).toBe(42);
  });

  it("corrélation injections depuis logs et menaces", () => {
    const summary = buildSecurityAnalysisSummary({
      stats: {},
      blockedRaw: [],
      blockedIpsMeta: null,
      logs: [
        {
          eventType: "sql_injection",
          category: "injection",
          message: "sql injection attempt",
        },
      ],
      threats: [{ threatType: "XSS", message: "xss payload" }],
    });

    expect(summary.totalSqlInjections).toBeGreaterThanOrEqual(1);
    expect(summary.totalXssAttempts).toBeGreaterThanOrEqual(1);
  });

  it("génère des recommandations dynamiques selon menaces ouvertes", () => {
    const summary = buildSecurityAnalysisSummary({
      stats: { overview: { riskScore: 30 } },
      blockedRaw: [],
      blockedIpsMeta: null,
      logs: [],
      threats: [{ threatType: "BRUTE_FORCE", blocked: false }],
    });
    const recs = buildSecurityRecommendations(summary);
    expect(recs.some((r) => r.title.includes("menace"))).toBe(true);
    expect(recs.some((r) => r.severity === "critical")).toBe(true);
  });
});
