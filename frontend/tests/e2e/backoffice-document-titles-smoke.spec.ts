import { expect, test } from "@playwright/test";

/** Pages backoffice — titres fil d'Ariane (doivent rester stables après chargement). */
const BACKOFFICE_TITLE_PAGES = [
  ["/backoffice", "Tableau de bord / Vue d'ensemble"],
  ["/backoffice/performances", "Tableau de bord / Performances / Synthèse"],
  ["/backoffice/security/analysis", "Sécurité / Analyse"],
  ["/backoffice/mobile/releases", "Mobile / Releases OTA"],
  ["/backoffice/statistics/log-stats", "Tableau de bord / Statistiques / Logs (stats)"],
] as const;

for (const [path, titleFragment] of BACKOFFICE_TITLE_PAGES) {
  test(`${path} — titre onglet stable après chargement`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle", timeout: 120_000 });
    await page.locator("main").first().waitFor({ state: "visible", timeout: 60_000 });
    // Laisse Next.js tenter de réécrire le titre (bug corrigé par DocumentTitleManager)
    await page.waitForTimeout(1200);
    await expect(page).toHaveTitle(new RegExp(`${titleFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| JobbingTrack`));
    await page.waitForTimeout(800);
    await expect(page).toHaveTitle(new RegExp(`${titleFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| JobbingTrack`));
  });
}
