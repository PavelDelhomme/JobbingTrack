import {
  findConsolidatedBlockEntry,
  resolveThreatBlockStatus,
} from "./threatBlockPresentation";

describe("threatBlockPresentation", () => {
  it("distingue blocage automatique et manuel", () => {
    const automatic = resolveThreatBlockStatus(
      {
        id: "t1",
        sourceIp: "203.0.113.10",
        severity: "HIGH",
        blocked: true,
        metadata: { blockOrigin: "automatic_threat" },
      },
      {
        ip: "203.0.113.10",
        blockOrigin: "automatic_threat",
        reason: "Auto-block: PORT_SCAN (HIGH)",
      },
    );
    expect(automatic).toMatchObject({
      kind: "blocked_automatic",
      label: "Bloqué automatiquement",
      showBlockButton: false,
    });

    const manual = resolveThreatBlockStatus(
      {
        id: "t2",
        sourceIp: "198.51.100.42",
        severity: "HIGH",
        blocked: true,
        metadata: { blockOrigin: "manual_rule" },
      },
      null,
    );
    expect(manual).toMatchObject({
      kind: "blocked_manual",
      label: "Bloqué manuellement",
    });
  });

  it("explique pourquoi une menace high reste non bloquée", () => {
    const privateIp = resolveThreatBlockStatus(
      {
        id: "t3",
        sourceIp: "192.168.1.50",
        severity: "HIGH",
        blocked: false,
      },
      null,
    );
    expect(privateIp).toMatchObject({
      kind: "recommended",
      label: "Blocage recommandé",
    });
    expect(privateIp.detail).toContain("IP privée");

    const publicIp = resolveThreatBlockStatus(
      {
        id: "t4",
        sourceIp: "8.8.8.8",
        severity: "CRITICAL",
        blocked: false,
      },
      null,
    );
    expect(publicIp.kind).toBe("recommended");
    expect(publicIp.detail).toContain("auto-blocage");
  });

  it("retrouve une entrée consolidée par menace ou IP", () => {
    const entries = [
      { ip: "198.51.100.1", blockOrigin: "manual_rule" },
      { threatId: "abc", blockOrigin: "automatic_threat" },
    ];
    expect(
      findConsolidatedBlockEntry(
        { id: "abc", sourceIp: "1.2.3.4" },
        entries,
      )?.blockOrigin,
    ).toBe("automatic_threat");
    expect(
      findConsolidatedBlockEntry(
        { id: "xyz", sourceIp: "198.51.100.1" },
        entries,
      )?.blockOrigin,
    ).toBe("manual_rule");
  });
});
