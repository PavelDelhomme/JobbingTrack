import { expect, test } from "@playwright/test";

const SECURITY_PAGES = [
  ["/b4ck0ff1ce/security", "Sécurité"],
  ["/b4ck0ff1ce/security/analysis", "Analyse sécurité"],
  ["/b4ck0ff1ce/security/firewall", "Firewall"],
  ["/b4ck0ff1ce/security/logs", "Logs sécurité"],
  ["/b4ck0ff1ce/security/network", "Sécurité réseau"],
  ["/b4ck0ff1ce/security/policies", "Politiques sécurité"],
  ["/b4ck0ff1ce/security/threats", "Menaces sécurité"],
  ["/b4ck0ff1ce/security/incidents", "Incidents sécurité"],
  ["/b4ck0ff1ce/security/alerts", "Alertes email sécurité"],
] as const;

for (const [path, title] of SECURITY_PAGES) {
  test(`${path} expose un titre navigateur français`, async ({ page }) => {
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.locator("main").first().waitFor({ state: "visible" });
    await expect(page).toHaveTitle(new RegExp(`${title} \\| JobbingTrack`));
  });
}
