import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "smartphone", width: 390, height: 844 },
  { name: "moyen", width: 820, height: 900 },
  { name: "petit-pc", width: 1280, height: 900 },
  { name: "grand-ecran", width: 1680, height: 1000 },
] as const;

const ROUTES = [
  ["/b4ck0ff1ce", "Hub backoffice"],
  ["/b4ck0ff1ce/analytics", "Analytics hub"],
  ["/b4ck0ff1ce/analytics/application", "Analytics application redirect"],
  ["/b4ck0ff1ce/analytics/application/performance", "Analytics application performance"],
  ["/b4ck0ff1ce/analytics/application/activity", "Analytics application activité"],
  ["/b4ck0ff1ce/analytics/application/feedback", "Analytics application retours"],
  ["/b4ck0ff1ce/analytics/containers", "Analytics conteneurs"],
  ["/b4ck0ff1ce/analytics/network", "Analytics réseau"],
  ["/b4ck0ff1ce/analytics/performances", "Analytics performances"],
  ["/b4ck0ff1ce/api-tester", "API tester"],
  ["/b4ck0ff1ce/applications", "Candidatures"],
  ["/b4ck0ff1ce/archives", "Archives"],
  ["/b4ck0ff1ce/billing", "Facturation"],
  ["/b4ck0ff1ce/calls", "Appels"],
  ["/b4ck0ff1ce/companies", "Entreprises"],
  ["/b4ck0ff1ce/contacts", "Contacts"],
  ["/b4ck0ff1ce/data-management", "Gestion données"],
  ["/b4ck0ff1ce/datas", "Données"],
  ["/b4ck0ff1ce/email-monitor?type=NOTIFICATION", "Email Monitor"],
  ["/b4ck0ff1ce/emails", "Emails hub"],
  ["/b4ck0ff1ce/emails/deliverability", "Emails délivrabilité"],
  ["/b4ck0ff1ce/emails/settings", "Emails configuration"],
  ["/b4ck0ff1ce/emails/templates", "Emails templates"],
  ["/b4ck0ff1ce/events", "Événements"],
  ["/b4ck0ff1ce/followups", "Relances"],
  ["/b4ck0ff1ce/interviews", "Entretiens"],
  ["/b4ck0ff1ce/mobile-emulator", "Émulateur mobile"],
  ["/b4ck0ff1ce/notifications", "Notifications"],
  ["/b4ck0ff1ce/statistics", "Statistics overview"],
  ["/b4ck0ff1ce/statistics/security", "Statistics sécurité"],
  ["/b4ck0ff1ce/statistics/log-stats", "Statistics logs"],
  ["/b4ck0ff1ce/statistics/app-data", "Statistics données applicatives"],
  ["/b4ck0ff1ce/statistique", "Statistique legacy"],
  ["/b4ck0ff1ce/performances", "Performances synthèse"],
  ["/b4ck0ff1ce/performances/latency", "Performances latence"],
  ["/b4ck0ff1ce/performances/containers", "Performances conteneurs"],
  ["/b4ck0ff1ce/performances/correlation", "Performances corrélation"],
  ["/b4ck0ff1ce/performances/disk", "Performances disque"],
  ["/b4ck0ff1ce/performances/network", "Performances réseau"],
  ["/b4ck0ff1ce/security", "Sécurité overview"],
  ["/b4ck0ff1ce/security/analysis", "Sécurité analyse"],
  ["/b4ck0ff1ce/security/firewall", "Sécurité firewall"],
  ["/b4ck0ff1ce/security/logs", "Sécurité logs"],
  ["/b4ck0ff1ce/security/network", "Sécurité réseau"],
  ["/b4ck0ff1ce/security/incidents", "Sécurité incidents"],
  ["/b4ck0ff1ce/security/alerts", "Sécurité alertes email"],
  ["/b4ck0ff1ce/security/policies", "Sécurité politiques"],
  ["/b4ck0ff1ce/security/threats", "Sécurité menaces"],
  ["/b4ck0ff1ce/tests", "Tests hub"],
  ["/b4ck0ff1ce/tests-security", "Tests sécurité"],
  ["/b4ck0ff1ce/test-reports", "Rapports de tests"],
  ["/b4ck0ff1ce/playwright-tests", "Tests Playwright"],
  ["/b4ck0ff1ce/tests-api", "Tests API"],
  ["/b4ck0ff1ce/tests-backend", "Tests backend"],
  ["/b4ck0ff1ce/tests-frontend", "Tests frontend"],
  ["/b4ck0ff1ce/tests-backoffice", "Tests backoffice"],
  ["/b4ck0ff1ce/tests-performance", "Tests performance legacy"],
  ["/b4ck0ff1ce/performance-tests", "Tests performance"],
  ["/b4ck0ff1ce/performance-tests/schedule", "Programmer tests performance"],
  ["/b4ck0ff1ce/search", "Recherche"],
  ["/b4ck0ff1ce/suivi-interim", "Suivi intérim"],
  ["/b4ck0ff1ce/test-data", "Données de test"],
  ["/b4ck0ff1ce/trash", "Corbeille"],
  ["/b4ck0ff1ce/user-analytics", "Analytics utilisateur"],
  ["/b4ck0ff1ce/user-journey", "Parcours utilisateur"],
  ["/b4ck0ff1ce/user-journey/custom", "Parcours personnalisé"],
  ["/b4ck0ff1ce/user-journey/reports", "Rapports parcours"],
  ["/b4ck0ff1ce/user-stats", "Statistiques utilisateur"],
  ["/b4ck0ff1ce/users", "Utilisateurs"],
  ["/b4ck0ff1ce/services", "Services"],
] as const;

type ResponsiveIssue = {
  route: string;
  label: string;
  issue: string;
};

async function collectResponsiveIssues(
  page: import("@playwright/test").Page,
  route: string,
  label: string,
): Promise<ResponsiveIssue[]> {
  return page.evaluate(
    ({ route, label }) => {
      const issues: ResponsiveIssue[] = [];
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const main = document.querySelector("main") || document.body;
      const interactive = Array.from(
        main.querySelectorAll<HTMLElement>(
          'a,button,input,select,textarea,[role="button"],[role="link"]',
        ),
      );

      const isInsideHorizontalScroller = (node: HTMLElement): boolean => {
        let current: HTMLElement | null = node.parentElement;
        while (current && current !== main && current !== document.body) {
          const style = window.getComputedStyle(current);
          const scrollable =
            (style.overflowX === "auto" || style.overflowX === "scroll") &&
            current.scrollWidth > current.clientWidth + 6;
          if (scrollable) return true;
          current = current.parentElement;
        }
        return false;
      };

      for (const el of interactive) {
        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          el.getAttribute("aria-hidden") === "true"
        ) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const outsideLeft = rect.left < -6;
        const outsideRight = rect.right > vw + 6;
        if (!outsideLeft && !outsideRight) continue;
        if (isInsideHorizontalScroller(el)) continue;

        const text =
          el.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ||
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.tagName.toLowerCase();
        issues.push({
          route,
          label,
          issue: `interactive outside viewport: ${text} (${Math.round(
            rect.left,
          )}-${Math.round(rect.right)} / ${vw})`,
        });
      }

      return issues;
    },
    { route, label },
  );
}

for (const viewport of VIEWPORTS) {
  test(`responsive backoffice complet — ${viewport.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    const allIssues: ResponsiveIssue[] = [];

    for (const [route, label] of ROUTES) {
      await test.step(`${viewport.name} — ${label}`, async () => {
        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        const mainVisible = await page
          .locator("main")
          .first()
          .waitFor({
            state: "visible",
            timeout: 20_000,
          })
          .then(() => true)
          .catch(() => false);

        if (!mainVisible) {
          const body = ((await page.locator("body").textContent()) || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 120);
          allIssues.push({
            route,
            label,
            issue: `main absent ou auth bloquée; body="${body}"`,
          });
          return;
        }

        await page.waitForTimeout(750);
        const networkErrors = await page
          .getByText(/Network Error|AxiosError/i)
          .count();
        if (networkErrors > 0) {
          allIssues.push({
            route,
            label,
            issue: `erreurs réseau visibles: ${networkErrors}`,
          });
        }
        allIssues.push(...(await collectResponsiveIssues(page, route, label)));
      });
    }

    expect(
      allIssues,
      allIssues.map((i) => `${i.route} (${i.label}) — ${i.issue}`).join("\n"),
    ).toEqual([]);
  });
}
