import { buildThreatInvestigationTimeline } from "./threatInvestigationTimeline";

describe("threatInvestigationTimeline", () => {
  it("fusionne et trie les événements multi-sources", () => {
    const timeline = buildThreatInvestigationTimeline({
      threat: {
        id: "t1",
        threatType: "BRUTE_FORCE",
        severity: "HIGH",
        detectedAt: "2026-06-16T10:00:00.000Z",
        blocked: false,
        sourceIp: "198.51.100.42",
      },
      investigation: {
        application: {
          recentEvents: [
            {
              id: "log-1",
              timestamp: "2026-06-16T10:05:00.000Z",
              level: "critical",
              eventType: "high_traffic",
              message: "Trafic anormal",
              endpoint: "/api/v1/auth/login",
              method: "POST",
              isBlocked: true,
              metadata: { requestId: "req-abc" },
            },
          ],
        },
        related: {
          intrusionAttempts: [
            {
              id: "intr-1",
              timestamp: "2026-06-16T10:02:00.000Z",
              attackType: "BRUTE_FORCE",
              targetEndpoint: "/api/v1/auth/login",
              method: "POST",
              riskScore: 85,
            },
          ],
          ddosAttacks: [
            {
              id: "ddos-1",
              timestamp: "2026-06-16T10:08:00.000Z",
              attackType: "application",
              targetEndpoint: "/api/v1/jobs",
              requestsPerSecond: 120,
            },
          ],
        },
        network: {
          connectionDetails: [
            {
              observedAt: "2026-06-16T10:01:00.000Z",
              protocol: "TCP",
              localIp: "172.20.0.5",
              localPort: 443,
              remoteIp: "198.51.100.42",
              remotePort: 51234,
              state: "ESTABLISHED",
            },
          ],
        },
      },
    });

    expect(timeline.map((item) => item.source)).toEqual([
      "ddos_attack",
      "security_log",
      "intrusion_attempt",
      "network_connection",
      "threat",
    ]);
    expect(timeline[1]).toMatchObject({
      source: "security_log",
      requestId: "req-abc",
      href: expect.stringContaining("highlight=log-1"),
    });
  });

  it("ignore les entrées sans horodatage exploitable", () => {
    const timeline = buildThreatInvestigationTimeline({
      threat: { id: "t2" },
      investigation: {
        related: {
          intrusionAttempts: [{ id: "x", attackType: "XSS" }],
        },
      },
    });
    expect(timeline).toHaveLength(0);
  });
});
