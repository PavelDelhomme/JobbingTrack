import {
  buildSecurityAnalysisSummary,
  buildSecurityRecommendations,
  computeSecurityDetectionsCount,
  readStoredSecurityScoreWeights,
} from "./securityAnalysisSummary";
import {
  calculateSecurityScore,
  DEFAULT_SECURITY_SCORE_WEIGHTS,
} from "./securityScore";

describe("securityAnalysisSummary", () => {
  it("utilise le total paginé firewall et le score pondéré partagé", () => {
    const summary = buildSecurityAnalysisSummary({
      stats: {},
      blockedRaw: [{ ip: "203.0.113.1" }],
      blockedIpsMeta: {
        count: 5,
        pagination: { page: 1, limit: 10, total: 5, pages: 1 },
      },
      logs: Array.from({ length: 25 }, () => ({ level: "info" })),
      threats: [{ threatType: "BRUTE_FORCE" }],
      wafEnabled: false,
      weights: DEFAULT_SECURITY_SCORE_WEIGHTS,
    });

    expect(summary.uniqueBlockedIPs).toBe(5);
    const expected = calculateSecurityScore(
      {
        threatsCount: 1,
        logsCount: 25,
        blockedIpsCount: 5,
        wafEnabled: false,
      },
      DEFAULT_SECURITY_SCORE_WEIGHTS,
    );
    expect(summary.securityScore).toBe(expected);
  });

  it("aligne detectionsCount avec la vue d’ensemble", () => {
    const logs = [{ eventType: "waf_blocked", level: "warning" }];
    const threats = [{ threatType: "SQL_INJECTION" }];
    const summary = buildSecurityAnalysisSummary({
      stats: {},
      blockedRaw: [],
      blockedIpsMeta: null,
      logs,
      threats,
    });
    expect(summary.detectionsCount).toBe(
      computeSecurityDetectionsCount(logs, threats),
    );
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
      stats: {},
      blockedRaw: [],
      blockedIpsMeta: null,
      logs: Array.from({ length: 80 }, () => ({ level: "warning" })),
      threats: Array.from({ length: 15 }, () => ({
        threatType: "BRUTE_FORCE",
        blocked: false,
      })),
      wafEnabled: true,
      weights: DEFAULT_SECURITY_SCORE_WEIGHTS,
    });
    const recs = buildSecurityRecommendations(summary);
    expect(recs.some((r) => r.title.includes("menace"))).toBe(true);
    expect(recs.some((r) => r.severity === "critical")).toBe(true);
  });
});
