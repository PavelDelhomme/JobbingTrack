import {
  formatSecurityLogLinkReason,
  readSecurityLogThreatId,
  resolveSecurityLogLink,
} from "./securityLogLinks";

describe("securityLogLinks", () => {
  it("priorise metadata.threatId puis correlatedThreatId", () => {
    expect(
      readSecurityLogThreatId({
        metadata: { threatId: "meta-1" },
        correlatedThreatId: "corr-1",
      }),
    ).toBe("meta-1");
    expect(
      readSecurityLogThreatId({
        correlatedThreatId: "corr-1",
        linkSource: "correlation",
      }),
    ).toBe("corr-1");
  });

  it("construit un lien menace ou une raison explicite", () => {
    expect(
      resolveSecurityLogLink({
        metadata: { threatId: "threat-1" },
        linkReason: "metadata_threat_id",
      }),
    ).toMatchObject({
      href: "/b4ck0ff1ce/security/threats/threat-1",
      label: "Menace liée",
    });

    expect(
      resolveSecurityLogLink({
        correlatedThreatId: "threat-2",
        linkSource: "correlation",
        linkReason: "correlation_ip_temps",
      }),
    ).toMatchObject({
      href: "/b4ck0ff1ce/security/threats/threat-2",
      label: "Menace corrélée",
    });

    const missing = resolveSecurityLogLink({
      linkReason: "lab_non_rattache",
    });
    expect(missing.href).toBeNull();
    expect(missing.title).toBe("Log lab sans menace rattachée");
    expect(formatSecurityLogLinkReason("aucune_menace_ip")).toBe(
      "Aucune menace pour cette IP",
    );
  });
});
