const {
  classifyHostname,
  evaluatePreflight,
  parseTarget,
} = require("../../scripts/security/controlled-offensive-preflight.cjs");

describe("controlled offensive preflight", () => {
  it("autorise une cible locale en dry-run", () => {
    const result = evaluatePreflight({
      target: "http://localhost:5002",
      environment: "local",
      scenarios: ["header-spoofing"],
      allowExternal: false,
      allowProductionWindow: false,
    });

    expect(result.status).toBe("allowed");
    expect(result.dryRun).toBe(true);
    expect(result.targetScope).toBe("local");
    expect(result.scenarios[0]).toEqual(
      expect.objectContaining({
        id: "header-spoofing",
        willRunPayload: false,
      }),
    );
  });

  it("classe les reseaux prives et RFC 5737 comme lab par defaut", () => {
    expect(classifyHostname("192.168.1.20").safeByDefault).toBe(true);
    expect(classifyHostname("10.0.0.42").safeByDefault).toBe(true);
    expect(classifyHostname("198.51.100.42").scope).toBe("documentation-lab");
    expect(classifyHostname("example.test").scope).toBe("reserved-domain");
  });

  it("demande une approbation pour une cible publique hors prod", () => {
    const result = evaluatePreflight({
      target: "https://example.com",
      environment: "preprod",
      scenarios: ["url-injection"],
      allowExternal: false,
      allowProductionWindow: false,
    });

    expect(result.status).toBe("needs_approval");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "approval" }),
      ]),
    );
  });

  it("bloque une cible production sans fenetre explicite", () => {
    const result = evaluatePreflight({
      target: "https://jobbingtrack.com",
      environment: "production",
      scenarios: ["remote-host"],
      allowExternal: true,
      allowProductionWindow: false,
    });

    expect(result.status).toBe("blocked");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "blocker" }),
      ]),
    );
  });

  it("signale une URL cible invalide", () => {
    const target = parseTarget("not-a-url");

    expect(target.valid).toBe(false);
    expect(target.reason).toMatch(/valid absolute URL/);
  });
});
