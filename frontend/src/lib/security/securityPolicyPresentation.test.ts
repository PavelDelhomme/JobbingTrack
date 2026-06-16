import { buildSecurityPolicyPosture } from "./securityPolicyPresentation";

describe("securityPolicyPresentation", () => {
  it("marque une posture complète comme opérationnelle", () => {
    const posture = buildSecurityPolicyPosture({
      waf: {
        enabled: true,
        rules: [
          { enabled: true, severity: "critical" },
          { enabled: true, severity: "high" },
        ],
      },
      firewallRulesCount: 2,
      blockedIpsCount: 1,
      notifications: {
        enabled: true,
        recipients: ["security@jobbingtrack.test"],
        levels: ["critical", "high"],
      },
    });

    expect(posture.find((item) => item.key === "waf")).toMatchObject({
      status: "ok",
      value: "Actif",
      detail: "2 règle(s) high/critical active(s)",
    });
    expect(posture.find((item) => item.key === "notifications")).toMatchObject({
      status: "ok",
      value: "Notifiées",
    });
  });

  it("remonte les politiques critiques désactivées", () => {
    const posture = buildSecurityPolicyPosture({
      waf: { enabled: false, rules: [] },
      firewallRulesCount: 0,
      blockedIpsCount: 0,
      notifications: {
        enabled: true,
        recipients: [],
        levels: ["high"],
      },
    });

    expect(posture.find((item) => item.key === "waf")?.status).toBe("danger");
    expect(posture.find((item) => item.key === "firewall")?.status).toBe(
      "warning",
    );
    expect(posture.find((item) => item.key === "notifications")).toMatchObject({
      status: "danger",
      value: "À configurer",
    });
  });
});
