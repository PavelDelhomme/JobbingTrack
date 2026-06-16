import {
  buildSecurityLogForensicsIndex,
  enrichAggLogRow,
  enrichAggLogRows,
  hasMinimalHttpForensics,
  isAnalyzerAggregateWithoutHttp,
  isCorrelationTableEligibleRow,
  isIpLikeString,
  mergeAggLogMetadata,
  readFirstIpFromUnknownList,
} from "./incidentForensics";

describe("incidentForensics", () => {
  it("détecte une adresse IP plausible", () => {
    expect(isIpLikeString("203.0.113.89")).toBe(true);
    expect(isIpLikeString("security-analyzer")).toBe(false);
  });

  it("lit la première IP d'une liste suspiciousIPs", () => {
    expect(readFirstIpFromUnknownList(["203.0.113.89", "203.0.113.88"])).toBe(
      "203.0.113.89",
    );
  });

  it("fusionne metadata imbriquée et representativeForensics", () => {
    const merged = mergeAggLogMetadata({
      metadata: {
        category: "threat_analysis",
        representativeForensics: {
          method: "GET",
          endpoint: "/health?x=1",
          requestId: "lab-001",
        },
        metadata: {
          suspiciousIPs: ["203.0.113.89"],
        },
      },
    });
    expect(merged?.method).toBe("GET");
    expect(merged?.requestId).toBe("lab-001");
    expect(merged?.suspiciousIPs).toEqual(["203.0.113.89"]);
  });

  it("enrichit une alerte agrégée via logId security_logs", () => {
    const securityLogs = [
      {
        id: "sec-log-1",
        sourceIP: "203.0.113.89",
        endpoint: "/health?jt_corr=<script>",
        method: "GET",
        statusCode: 403,
        metadata: {
          requestId: "lab-correlation-perfect-002",
          protocol: "http",
          port: 3000,
        },
      },
    ];
    const index = buildSecurityLogForensicsIndex(securityLogs);
    const enriched = enrichAggLogRow(
      {
        level: "WARN",
        message: "Alerte waf",
        metadata: { logId: "sec-log-1" },
      },
      index,
    );
    expect(enriched.requestId).toBe("lab-correlation-perfect-002");
    expect(enriched.method).toBe("GET");
    expect(enriched.endpoint).toBe("/health?jt_corr=<script>");
    expect(enriched.sourceIP).toBe("203.0.113.89");
    expect(enriched.protocol).toBe("http");
    expect(String(enriched.port)).toBe("3000");
    expect(String(enriched.httpStatus)).toBe("403");
  });

  it("remonte l'IP depuis suspiciousIPs quand clientIp est absent", () => {
    const [enriched] = enrichAggLogRows(
      [
        {
          level: "ERROR",
          message: "Activité d'attaque critique détectée",
          metadata: {
            source: "security-analyzer",
            suspiciousIPs: ["203.0.113.88", "203.0.113.89"],
          },
        },
      ],
      [],
    );
    expect(enriched.sourceIP).toBe("203.0.113.88");
    expect(enriched.clientIp).toBe("203.0.113.88");
  });

  it("exclut les agrégats analyseur sans HTTP du tableau corrélation", () => {
    const row = {
      level: "ERROR",
      message: "Alerte de sécurité créée: Activité d'attaque critique détectée",
      metadata: {
        source: "security-analyzer",
        category: "threat_analysis",
        eventType: "security_alert_created",
        suspiciousIPs: ["203.0.113.89"],
      },
    };
    expect(isAnalyzerAggregateWithoutHttp(row)).toBe(true);
    expect(
      isCorrelationTableEligibleRow(row, {
        requestId: null,
        httpMethod: null,
        endpoint: null,
        ip: "203.0.113.89",
        protocol: null,
        port: null,
        httpStatus: null,
      }),
    ).toBe(false);
  });

  it("accepte une ligne WAF avec forensics HTTP complets", () => {
    const ctx = {
      requestId: "lab-001",
      httpMethod: "GET",
      endpoint: "/health?x=1",
      ip: "203.0.113.89",
      protocol: "http",
      port: "3000",
      httpStatus: "403",
    };
    expect(hasMinimalHttpForensics(ctx)).toBe(true);
    expect(
      isCorrelationTableEligibleRow(
        {
          level: "WARN",
          message: "Attaque détectée par WAF",
          metadata: { eventType: "waf_blocked_request" },
        },
        ctx,
      ),
    ).toBe(true);
  });
});
