import {
  formatConnectionConfidence,
  resolveConnectionPresentation,
  threatLinkForSourceIp,
} from "./connectionSourcePresentation";

describe("connectionSourcePresentation", () => {
  it("classe une IP publique distante et un conteneur Docker", () => {
    const row = resolveConnectionPresentation({
      remoteIp: "198.51.100.42",
      localIp: "172.19.0.5",
      localPort: 3017,
      remotePort: 54321,
      protocol: "TCP",
      state: "ESTABLISHED",
      containerName: "jobbingtrack-security-service",
    });

    expect(row.source?.label).toBe("IP publique");
    expect(row.source?.ip).toBe("198.51.100.42");
    expect(row.destination?.label).toBe("jobbingtrack-security-service");
    expect(formatConnectionConfidence(row.source?.confidence)).toBe("Élevée");
  });

  it("remplace 0.0.0.0 par une lecture éphémère explicite", () => {
    const row = resolveConnectionPresentation({
      remoteIp: "0.0.0.0",
      localPort: 3000,
      protocol: "TCP",
    });

    expect(row.source?.kind).toBe("ephemeral");
    expect(row.source?.label).toBe("Port éphémère");
  });

  it("propose un lien menace uniquement pour IP publique", () => {
    expect(threatLinkForSourceIp("198.51.100.42")).toContain("sourceIp=");
    expect(threatLinkForSourceIp("172.19.0.2")).toBeNull();
  });
});
