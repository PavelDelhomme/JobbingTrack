import {
  BACKOFFICE_DOCUMENT_TITLES,
  resolveBackofficeDocumentTitle,
} from "./backofficeDocumentTitles";
import {
  formatDocumentTitle,
  PAGE_TITLE_BY_PATH,
  resolvePageTitle,
} from "./pageTitles";

describe("backofficeDocumentTitles", () => {
  it("résout les sous-onglets Performances avec fil d'Ariane", () => {
    expect(resolveBackofficeDocumentTitle("/backoffice/performances")).toBe(
      "Tableau de bord / Performances / Synthèse",
    );
    expect(
      resolveBackofficeDocumentTitle("/backoffice/performances/cpu-memory"),
    ).toBe("Tableau de bord / Performances / CPU & Mémoire");
    expect(
      resolveBackofficeDocumentTitle(
        "/backoffice/performances/correlation/containers",
      ),
    ).toBe("Tableau de bord / Performances / Corrélation / Signaux conteneurs");
  });

  it("résout les sections Sécurité et Administration", () => {
    expect(resolveBackofficeDocumentTitle("/backoffice/security/analysis")).toBe(
      "Sécurité / Analyse",
    );
    expect(resolveBackofficeDocumentTitle("/backoffice/users")).toBe(
      "Administration / Utilisateurs",
    );
  });

  it("couvre toutes les entrées statiques backoffice", () => {
    for (const path of Object.keys(BACKOFFICE_DOCUMENT_TITLES)) {
      expect(resolveBackofficeDocumentTitle(path)).toBeTruthy();
    }
  });
});

describe("pageTitles", () => {
  it("formate le titre avec le suffixe application", () => {
    expect(formatDocumentTitle("Agent email")).toBe("Agent email | JobbingTrack");
    expect(formatDocumentTitle("JobbingTrack")).toBe("JobbingTrack");
    expect(
      formatDocumentTitle("Tableau de bord / Performances / Synthèse"),
    ).toBe("Tableau de bord / Performances / Synthèse | JobbingTrack");
  });

  it("résout les routes principales du backoffice", () => {
    expect(resolvePageTitle("/agent")).toBe("Agent email");
    expect(resolvePageTitle("/backoffice")).toBe(
      "Tableau de bord / Vue d'ensemble",
    );
    expect(resolvePageTitle("/backoffice/performances")).toBe(
      "Tableau de bord / Performances / Synthèse",
    );
    expect(resolvePageTitle("/backoffice/statistics/log-stats")).toBe(
      "Tableau de bord / Statistiques / Logs (stats)",
    );
    expect(resolvePageTitle("/backoffice/security/network")).toBe(
      "Sécurité / Réseau",
    );
  });

  it("résout les routes dynamiques backoffice", () => {
    expect(resolvePageTitle("/backoffice/applications/abc-123")).toBe(
      "Recherche emploi / Candidatures / Détail",
    );
    expect(resolvePageTitle("/backoffice/security/threats/th-1")).toBe(
      "Sécurité / Menaces / Détail",
    );
    expect(resolvePageTitle("/backoffice/users/user-1")).toBe(
      "Administration / Utilisateurs / Détail",
    );
  });

  it("couvre toutes les entrées statiques hors backoffice du registre", () => {
    for (const path of Object.keys(PAGE_TITLE_BY_PATH)) {
      expect(resolvePageTitle(path)).toBeTruthy();
    }
  });
});
