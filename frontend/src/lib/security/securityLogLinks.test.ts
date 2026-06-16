import {
  formatSecurityLogLinkReason,
  isPersistedThreatId,
  readSecurityLogThreatId,
  resolveSecurityLogLink,
} from "./securityLogLinks";

const VALID_CUID = "c1234567890abcdefghijkl";

describe("securityLogLinks", () => {
  it("priorise correlatedThreatId valide puis metadata CUID", () => {
    expect(
      readSecurityLogThreatId({
        metadata: { threatId: VALID_CUID },
        correlatedThreatId: "c9876543210zyxwvutsrqpon",
      }),
    ).toBe("c9876543210zyxwvutsrqpon");
    expect(
      readSecurityLogThreatId({
        metadata: { threatId: VALID_CUID },
      }),
    ).toBe(VALID_CUID);
  });

  it("rejette les IDs synthétiques lab", () => {
    expect(isPersistedThreatId("lab-autocomplete-threat")).toBe(false);
    expect(
      readSecurityLogThreatId({
        metadata: { threatId: "lab-autocomplete-threat" },
        linkReason: "lab_non_rattache",
      }),
    ).toBeNull();

    const missing = resolveSecurityLogLink({
      metadata: { threatId: "lab-autocomplete-threat" },
      linkReason: "lab_non_rattache",
    });
    expect(missing.href).toBeNull();
    expect(missing.label).toBe("Log lab sans menace rattachée");
    expect(missing.title).toBe("Log lab sans menace rattachée");
  });

  it("construit un lien menace ou une raison explicite", () => {
    expect(
      resolveSecurityLogLink({
        metadata: { threatId: VALID_CUID },
        linkReason: "metadata_threat_id",
      }),
    ).toMatchObject({
      href: `/backoffice/security/threats/${VALID_CUID}`,
      label: "Menace liée",
    });

    expect(
      resolveSecurityLogLink({
        correlatedThreatId: "c9876543210zyxwvutsrqpon",
        linkSource: "correlation",
        linkReason: "correlation_ip_temps",
      }),
    ).toMatchObject({
      href: "/backoffice/security/threats/c9876543210zyxwvutsrqpon",
      label: "Menace corrélée",
    });

    expect(formatSecurityLogLinkReason("menace_introuvable")).toBe(
      "Menace référencée introuvable",
    );
    expect(formatSecurityLogLinkReason("aucune_menace_ip")).toBe(
      "Aucune menace pour cette IP",
    );
  });
});
