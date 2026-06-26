import {
  formatDocumentTitle,
  PAGE_TITLE_BY_PATH,
  resolvePageTitle,
} from "./pageTitles";

describe("pageTitles", () => {
  it("formate le titre avec le suffixe application", () => {
    expect(formatDocumentTitle("Agent email")).toBe("Agent email | JobbingTrack");
    expect(formatDocumentTitle("JobbingTrack")).toBe("JobbingTrack");
  });

  it("résout les routes principales du backoffice", () => {
    expect(resolvePageTitle("/agent")).toBe("Agent email");
    expect(resolvePageTitle("/backoffice")).toBe("Vue d'ensemble");
    expect(resolvePageTitle("/backoffice/statistics/log-stats")).toBe(
      "Statistiques — Logs",
    );
    expect(resolvePageTitle("/backoffice/security/network")).toBe(
      "Sécurité — Réseau",
    );
  });

  it("résout les routes dynamiques", () => {
    expect(resolvePageTitle("/backoffice/applications/abc-123")).toBe(
      "Détail candidature",
    );
    expect(resolvePageTitle("/backoffice/security/threats/th-1")).toBe(
      "Détail menace",
    );
  });

  it("couvre toutes les entrées statiques du registre", () => {
    for (const path of Object.keys(PAGE_TITLE_BY_PATH)) {
      expect(resolvePageTitle(path)).toBeTruthy();
    }
  });
});
