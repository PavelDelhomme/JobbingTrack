const {
  buildThreatLookupWindow,
  collectCorrelationSourceIps,
  collectMetadataThreatIds,
  correlateLogWithThreats,
  enrichSecurityLogsWithThreatLinks,
  isPersistedThreatId,
  readRawThreatIdFromMetadata,
  readThreatIdFromMetadata,
  shouldAttemptCorrelation,
} = require("../src/utils/securityLogThreatCorrelation");

const VALID_CUID = "c1234567890abcdefghijkl";

describe("securityLogThreatCorrelation", () => {
  const threats = [
    {
      id: VALID_CUID,
      sourceIp: "198.51.100.42",
      detectedAt: new Date("2026-06-12T21:17:38.000Z"),
      threatType: "BRUTE_FORCE",
    },
    {
      id: "c9876543210zyxwvutsrqpon",
      sourceIp: "203.0.113.42",
      detectedAt: new Date("2026-06-12T21:17:39.000Z"),
      threatType: "PORT_SCAN",
    },
  ];

  const threatsByIp = new Map([
    ["198.51.100.42", [threats[0]]],
    ["203.0.113.42", [threats[1]]],
  ]);

  it("conserve un threatId CUID explicite dans metadata", () => {
    const log = {
      id: "log-1",
      eventType: "threat_blocked",
      category: "firewall",
      sourceIP: "192.0.2.24",
      timestamp: "2026-06-12T21:17:37.000Z",
      metadata: { threatId: VALID_CUID },
    };

    expect(correlateLogWithThreats(log, threatsByIp)).toEqual({
      correlatedThreatId: VALID_CUID,
      linkSource: "metadata",
      linkReason: "metadata_threat_id",
    });
  });

  it("rejette un threatId synthétique lab", () => {
    const log = {
      id: "log-lab",
      eventType: "network_threat_detected",
      category: "network",
      sourceIP: "198.51.100.42",
      timestamp: "2026-06-12T21:17:38.000Z",
      message: "Lab autocomplete: trafic réseau suspect depuis TEST-NET-3",
      metadata: { threatId: "lab-autocomplete-threat" },
    };

    expect(correlateLogWithThreats(log, threatsByIp)).toEqual({
      correlatedThreatId: null,
      linkSource: null,
      linkReason: "lab_non_rattache",
    });
    expect(readThreatIdFromMetadata(log.metadata)).toBeNull();
    expect(readRawThreatIdFromMetadata(log.metadata)).toBe(
      "lab-autocomplete-threat",
    );
    expect(isPersistedThreatId("lab-autocomplete-threat")).toBe(false);
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
      correlatedThreatId: VALID_CUID,
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

  it("enrichit un lot de logs et invalide les menaces absentes", () => {
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
      {
        id: "log-c",
        eventType: "network_threat_detected",
        category: "network",
        sourceIP: "198.51.100.42",
        timestamp: "2026-06-12T21:17:38.000Z",
        metadata: { threatId: "ghost-threat-id" },
      },
    ];

    const enriched = enrichSecurityLogsWithThreatLinks(logs, threats);
    expect(enriched[0].correlatedThreatId).toBe("c9876543210zyxwvutsrqpon");
    expect(enriched[1].linkReason).toBe("evenement_non_menace");
    expect(enriched[2].linkReason).toBe("menace_introuvable");
  });

  it("collecte les IP corrélables, metadata CUID et la fenêtre temporelle", () => {
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
      {
        metadata: { threatId: VALID_CUID },
      },
    ];

    expect(collectCorrelationSourceIps(logs)).toEqual(["203.0.113.42"]);
    expect(collectMetadataThreatIds(logs)).toEqual([VALID_CUID]);
    expect(readThreatIdFromMetadata({ threatId: VALID_CUID })).toBe(VALID_CUID);
    expect(shouldAttemptCorrelation(logs[0])).toBe(true);
    expect(buildThreatLookupWindow(logs).gte).toBeInstanceOf(Date);
  });
});
