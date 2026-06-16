import {
  classifySecurityEventNature,
  formatBlockOriginLabel,
  formatFirewallActionLabel,
  formatSecurityEventNatureLabel,
  formatSecurityEventTypeLabel,
  formatSecuritySeverity,
  formatThreatTypeLabel,
  getSecuritySeverityFilterOptions,
  getThreatSeverityFilterOptions,
  getThreatTypeFilterOptions,
  isHighOrCriticalSeverity,
} from "./securityLabels";

describe("securityLabels", () => {
  it("traduit les sévérités sécurité connues", () => {
    expect(formatSecuritySeverity("CRITICAL")).toBe("Critique");
    expect(formatSecuritySeverity("high")).toBe("Haute");
    expect(formatSecuritySeverity("MEDIUM")).toBe("Moyenne");
    expect(formatSecuritySeverity("LOW")).toBe("Faible");
  });

  it("détecte les sévérités high/critical quel que soit le casing", () => {
    expect(isHighOrCriticalSeverity("CRITICAL")).toBe(true);
    expect(isHighOrCriticalSeverity("high")).toBe(true);
    expect(isHighOrCriticalSeverity("medium")).toBe(false);
  });

  it("traduit les types de menaces API en libellés lisibles", () => {
    expect(formatThreatTypeLabel("PORT_SCAN")).toBe("Balayage de ports");
    expect(formatThreatTypeLabel("BRUTE_FORCE")).toBe("Force brute");
    expect(formatThreatTypeLabel("network-threat-detected")).toBe(
      "Menace réseau détectée",
    );
  });

  it("traduit les origines de blocage firewall", () => {
    expect(formatBlockOriginLabel("lab_simulation")).toBe("Test lab");
    expect(formatBlockOriginLabel("automatic_threat")).toBe("Automatique");
    expect(formatBlockOriginLabel("unknown")).toBe("Origine inconnue");
    expect(formatBlockOriginLabel(undefined)).toBeNull();
  });

  it("classifie la nature détection vs blocage", () => {
    expect(classifySecurityEventNature("waf_blocked")).toBe("detection");
    expect(classifySecurityEventNature("ip_blocked_manually")).toBe(
      "manual_block",
    );
    expect(formatSecurityEventNatureLabel("threat_blocked")).toBe(
      "Blocage automatique",
    );
  });

  it("traduit les types d'événements sécurité", () => {
    expect(formatSecurityEventTypeLabel("ip_blocked_manually")).toBe(
      "IP bloquée manuellement",
    );
    expect(formatSecurityEventTypeLabel("waf_toggled")).toBe("WAF modifié");
  });

  it("traduit les actions firewall", () => {
    expect(formatFirewallActionLabel("DENY")).toBe("Bloquer (DROP)");
    expect(formatFirewallActionLabel("REJECT")).toBe("Rejeter");
    expect(formatFirewallActionLabel("ALLOW")).toBe("Autoriser");
  });

  it("expose les options de filtres sécurité sans hardcoder les pages", () => {
    expect(
      getSecuritySeverityFilterOptions().map((option) => option.value),
    ).toEqual(["critical", "error", "warning", "info"]);
    expect(getThreatSeverityFilterOptions()[0]).toEqual({
      value: "CRITICAL",
      label: "Critique",
    });
    expect(
      getThreatTypeFilterOptions().some(
        (option) =>
          option.value === "BRUTE_FORCE" && option.label === "Force brute",
      ),
    ).toBe(true);
  });
});
