import { formatAnalyticsPageLabel } from "../pageLabels";

describe("formatAnalyticsPageLabel", () => {
  it("traduit les routes mobile connues", () => {
    expect(formatAnalyticsPageLabel("/home", "android")).toBe("Accueil");
    expect(formatAnalyticsPageLabel("applications", "ios")).toBe("Candidatures");
  });

  it("préfixe les pages mobile inconnues", () => {
    expect(formatAnalyticsPageLabel("CustomScreen", "android")).toBe(
      "Mobile · CustomScreen",
    );
  });

  it("retourne — si vide", () => {
    expect(formatAnalyticsPageLabel(null)).toBe("—");
  });
});
