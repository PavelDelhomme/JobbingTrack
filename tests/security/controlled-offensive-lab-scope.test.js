const {
  SERVICES,
  buildScope,
} = require("../../scripts/security/controlled-offensive-lab-scope.cjs");

describe("controlled offensive lab scope", () => {
  it("produit un manifeste plan-only pour le lab local", () => {
    const scope = buildScope({
      target: "http://localhost:5002",
      environment: "local",
      service: null,
      scenario: null,
    });

    expect(scope.status).toBe("ready_for_review");
    expect(scope.preflightStatus).toBe("allowed");
    expect(scope.dryRun).toBe(true);
    expect(scope.checkCount).toBeGreaterThan(0);
    expect(scope.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "api-gateway",
          scenario: "url-injection",
          mode: "plan-only",
          willRunPayload: false,
        }),
      ]),
    );
  });

  it("filtre par service et scenario", () => {
    const scope = buildScope({
      target: "http://localhost:5002",
      environment: "local",
      service: "auth-service",
      scenario: "shell-command",
    });

    expect(scope.checks).toHaveLength(1);
    expect(scope.checks[0]).toEqual(
      expect.objectContaining({
        service: "auth-service",
        scenario: "shell-command",
      }),
    );
  });

  it("bloque une cible production sans fenetre explicite", () => {
    const scope = buildScope({
      target: "https://jobbingtrack.com",
      environment: "production",
      service: null,
      scenario: null,
    });

    expect(scope.status).toBe("blocked");
    expect(scope.preflightStatus).toBe("blocked");
    expect(scope.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "blocker" }),
      ]),
    );
  });

  it("garde une matrice de services explicite", () => {
    expect(SERVICES.map((service) => service.id)).toEqual(
      expect.arrayContaining([
        "api-gateway",
        "auth-service",
        "monitoring-agent-rs",
      ]),
    );
  });
});
