import { expect, test } from "@playwright/test";

const SECURITY_PAGES = [
  ["/backoffice/security", "Sécurité"],
  ["/backoffice/security/analysis", "Analyse sécurité"],
  ["/backoffice/security/firewall", "Firewall"],
  ["/backoffice/security/logs", "Logs sécurité"],
  ["/backoffice/security/network", "Sécurité réseau"],
  ["/backoffice/security/policies", "Politiques sécurité"],
  ["/backoffice/security/threats", "Menaces sécurité"],
  ["/backoffice/security/incidents", "Incidents & menaces"],
  ["/backoffice/security/alerts", "Alertes email sécurité"],
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
