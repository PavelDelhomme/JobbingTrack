import {
  normalizeSecurityStatusFromCounts,
  securityStatusLabel,
} from "./securityStatus";

describe("securityStatus", () => {
  it("marque un rapport avec critical/high comme à traiter", () => {
    expect(normalizeSecurityStatusFromCounts("ok", 0, 1, 0, 0)).toBe(
      "vulnerable",
    );
    expect(normalizeSecurityStatusFromCounts("success", 1, 0, 0, 0)).toBe(
      "vulnerable",
    );
    expect(securityStatusLabel("vulnerable")).toBe("À traiter");
  });

  it("conserve le statut skipped même avec des compteurs vides", () => {
    expect(normalizeSecurityStatusFromCounts("skipped", 0, 0, 0, 0)).toBe(
      "skipped",
    );
    expect(securityStatusLabel("skipped")).toBe("Ignoré");
  });

  it("classe medium/low en surveillance sans bloquer comme critical/high", () => {
    expect(normalizeSecurityStatusFromCounts("ok", 0, 0, 1, 0)).toBe(
      "warning",
    );
    expect(normalizeSecurityStatusFromCounts("ok", 0, 0, 0, 1)).toBe(
      "warning",
    );
    expect(securityStatusLabel("warning")).toBe("À surveiller");
  });
});
