import {
  countDetectionLikeLogs,
  isDdosThreat,
  isSqliThreat,
  isXssThreat,
} from "@/lib/security/threatSignals";

describe("threatSignals", () => {
  it("détecte SQLi par type ou payload", () => {
    expect(isSqliThreat({ threatType: "SQL_INJECTION" })).toBe(true);
    expect(
      isSqliThreat({
        threatType: "PORT_SCAN",
        metadata: { payload: "union select" },
      }),
    ).toBe(true);
    expect(isSqliThreat({ threatType: "PORT_SCAN" })).toBe(false);
  });

  it("détecte XSS", () => {
    expect(isXssThreat({ threatType: "XSS" })).toBe(true);
    expect(isXssThreat({ metadata: { payload: "<script>" } })).toBe(true);
  });

  it("détecte DDoS", () => {
    expect(isDdosThreat({ threatType: "DDOS_FLOOD" })).toBe(true);
  });

  it("compte les logs de détection et respecte excludeEventTypes", () => {
    const logs = [
      { eventType: "waf_block" },
      { eventType: "network_threat_detected" },
      { eventType: "login_ok" },
    ] as Record<string, unknown>[];
    expect(countDetectionLikeLogs(logs)).toBe(2);
    expect(
      countDetectionLikeLogs(logs, {
        excludeEventTypes: ["network_threat_detected"],
      }),
    ).toBe(1);
  });
});
