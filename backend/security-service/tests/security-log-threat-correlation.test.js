const {
  buildThreatLookupWindow,
  collectCorrelationSourceIps,
  correlateLogWithThreats,
  enrichSecurityLogsWithThreatLinks,
  readThreatIdFromMetadata,
  shouldAttemptCorrelation,
} = require("../src/utils/securityLogThreatCorrelation");

describe("securityLogThreatCorrelation", () => {
  const threats = [
    {
      id: "threat-bruteforce",
      sourceIp: "198.51.100.42",
      detectedAt: new Date("2026-06-12T21:17:38.000Z"),
      threatType: "BRUTE_FORCE",
    },
    {
      id: "threat-network",
      sourceIp: "203.0.113.42",
      detectedAt: new Date("2026-06-12T21:17:39.000Z"),
      threatType: "PORT_SCAN",
    },
  ];

  const threatsByIp = new Map([
    ["198.51.100.42", [threats[0]]],
    ["203.0.113.42", [threats[1]]],
  ]);

  it("conserve un threatId explicite dans metadata", () => {
    const log = {
      id: "log-1",
      eventType: "threat_blocked",
      category: "firewall",
      sourceIP: "192.0.2.24",
      timestamp: "2026-06-12T21:17:37.000Z",
      metadata: { threatId: "threat-explicit" },
    };

    expect(correlateLogWithThreats(log, threatsByIp)).toEqual({
      correlatedThreatId: "threat-explicit",
      linkSource: "metadata",
      linkReason: "metadata_threat_id",
    });
  });

  it("corrèle par IP et proximité temporelle", () => {
    const log = {
      id: "log-2",
      eventType: "intrusion_detected",
      category: "intrusion",
      sourceIP: "198.51.100.42",
      timestamp: "2026-06-12T21:17:38.500Z",
      message: "Brute force detected",
    };

    expect(correlateLogWithThreats(log, threatsByIp)).toEqual({
      correlatedThreatId: "threat-bruteforce",
      linkSource: "correlation",
      linkReason: "correlation_ip_temps",
    });
  });

  it("explique un log lab sans menace rattachée", () => {
    const log = {
      id: "log-3",
      eventType: "ddos_detected",
      category: "ddos",
      sourceIP: "192.0.2.55",
      timestamp: "2026-06-12T21:17:39.000Z",
      message: "Lab autocomplete: pic DDoS simulé sur gateway API",
    };

    expect(correlateLogWithThreats(log, threatsByIp)).toEqual({
      correlatedThreatId: null,
      linkSource: null,
      linkReason: "lab_non_rattache",
    });
  });

  it("enrichit un lot de logs", () => {
    const logs = [
      {
        id: "log-a",
        eventType: "network_threat_detected",
        category: "network",
        sourceIP: "203.0.113.42",
        timestamp: "2026-06-12T21:17:39.000Z",
      },
      {
        id: "log-b",
        eventType: "login_failed",
        category: "auth",
        sourceIP: "10.0.0.1",
        timestamp: "2026-06-12T21:17:35.000Z",
        message: "Login failed",
      },
    ];

    const enriched = enrichSecurityLogsWithThreatLinks(logs, threats);
    expect(enriched[0].correlatedThreatId).toBe("threat-network");
    expect(enriched[1].linkReason).toBe("evenement_non_menace");
  });

  it("collecte les IP corrélables et la fenêtre temporelle", () => {
    const logs = [
      {
        eventType: "network_threat_detected",
        category: "network",
        sourceIP: "203.0.113.42",
        timestamp: "2026-06-12T21:17:39.000Z",
      },
      {
        eventType: "login_failed",
        category: "auth",
        sourceIP: "10.0.0.1",
        timestamp: "2026-06-12T21:17:35.000Z",
      },
    ];

    expect(collectCorrelationSourceIps(logs)).toEqual(["203.0.113.42"]);
    expect(readThreatIdFromMetadata({ threatId: "abc" })).toBe("abc");
    expect(shouldAttemptCorrelation(logs[0])).toBe(true);
    expect(buildThreatLookupWindow(logs).gte).toBeInstanceOf(Date);
  });
});
