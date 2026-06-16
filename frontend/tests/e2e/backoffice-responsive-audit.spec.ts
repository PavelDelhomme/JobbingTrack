import { expect, test } from "@playwright/test";
import {
  gotoBackofficePage,
  warmupBackofficeRoutes,
} from "./backoffice-navigation";

const VIEWPORTS = [
  { name: "smartphone", width: 390, height: 844 },
  { name: "moyen", width: 820, height: 900 },
  { name: "petit-pc", width: 1280, height: 900 },
  { name: "grand-ecran", width: 1680, height: 1000 },
] as const;

const ROUTES = [
  ["/backoffice", "Hub backoffice"],
  ["/backoffice/analytics", "Analytics hub"],
  ["/backoffice/analytics/application", "Analytics application redirect"],
  [
    "/backoffice/analytics/application/performance",
    "Analytics application performance",
  ],
  [
    "/backoffice/analytics/application/activity",
    "Analytics application activité",
  ],
  [
    "/backoffice/analytics/application/feedback",
    "Analytics application retours",
  ],
  ["/backoffice/analytics/containers", "Analytics conteneurs"],
  ["/backoffice/analytics/network", "Analytics réseau"],
  ["/backoffice/analytics/performances", "Analytics performances"],
  ["/backoffice/api-tester", "API tester"],
  ["/backoffice/applications", "Candidatures"],
  ["/backoffice/archives", "Archives"],
  ["/backoffice/billing", "Facturation"],
  ["/backoffice/calls", "Appels"],
  ["/backoffice/companies", "Entreprises"],
  ["/backoffice/contacts", "Contacts"],
  ["/backoffice/data-management", "Gestion données"],
  ["/backoffice/datas", "Données"],
  ["/backoffice/email-monitor?type=NOTIFICATION", "Email Monitor"],
  ["/backoffice/emails", "Emails hub"],
  ["/backoffice/emails/deliverability", "Emails délivrabilité"],
  ["/backoffice/emails/settings", "Emails configuration"],
  ["/backoffice/emails/templates", "Emails templates"],
  ["/backoffice/events", "Événements"],
  ["/backoffice/followups", "Relances"],
  ["/backoffice/interviews", "Entretiens"],
  ["/backoffice/mobile-emulator", "Émulateur mobile"],
  ["/backoffice/notifications", "Notifications"],
  ["/backoffice/statistics", "Statistics overview"],
  ["/backoffice/statistics/security", "Statistics sécurité"],
  ["/backoffice/statistics/log-stats", "Statistics logs"],
  ["/backoffice/statistics/app-data", "Statistics données applicatives"],
  ["/backoffice/statistique", "Statistique legacy"],
  ["/backoffice/performances", "Performances synthèse"],
  ["/backoffice/performances/latency", "Performances latence"],
  ["/backoffice/performances/containers", "Performances conteneurs"],
  ["/backoffice/performances/correlation", "Performances corrélation"],
  ["/backoffice/performances/disk", "Performances disque"],
  ["/backoffice/performances/network", "Performances réseau"],
  ["/backoffice/security", "Sécurité overview"],
  ["/backoffice/security/analysis", "Sécurité analyse"],
  ["/backoffice/security/firewall", "Sécurité firewall"],
  ["/backoffice/security/logs", "Sécurité logs"],
  ["/backoffice/security/network", "Sécurité réseau"],
  ["/backoffice/security/incidents", "Sécurité incidents"],
  ["/backoffice/security/alerts", "Sécurité alertes email"],
  ["/backoffice/security/policies", "Sécurité politiques"],
  ["/backoffice/security/threats", "Sécurité menaces"],
  ["/backoffice/tests", "Tests hub"],
  ["/backoffice/tests-security", "Tests sécurité"],
  ["/backoffice/test-reports", "Rapports de tests"],
  ["/backoffice/playwright-tests", "Tests Playwright"],
  ["/backoffice/tests-api", "Tests API"],
  ["/backoffice/tests-backend", "Tests backend"],
  ["/backoffice/tests-frontend", "Tests frontend"],
  ["/backoffice/tests-backoffice", "Tests backoffice"],
  ["/backoffice/tests-performance", "Tests performance legacy"],
  ["/backoffice/performance-tests", "Tests performance"],
  ["/backoffice/performance-tests/schedule", "Programmer tests performance"],
  ["/backoffice/search", "Recherche"],
  ["/backoffice/suivi-interim", "Suivi intérim"],
  ["/backoffice/test-data", "Données de test"],
  ["/backoffice/trash", "Corbeille"],
  ["/backoffice/user-analytics", "Analytics utilisateur"],
  ["/backoffice/user-journey", "Parcours utilisateur"],
  ["/backoffice/user-journey/custom", "Parcours personnalisé"],
  ["/backoffice/user-journey/reports", "Rapports parcours"],
  ["/backoffice/user-stats", "Statistiques utilisateur"],
  ["/backoffice/users", "Utilisateurs"],
  ["/backoffice/services", "Services"],
] as const;

type ResponsiveIssue = {
  route: string;
  label: string;
  issue: string;
};

async function waitForBackofficeReady(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  await page
    .getByText("Connexion au backoffice")
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => {});

  return page
    .locator("main")
    .first()
    .waitFor({
      state: "visible",
      timeout: 45_000,
    })
    .then(() => true)
    .catch(() => false);
}

async function collectResponsiveIssues(
  page: import("@playwright/test").Page,
  route: string,
  label: string,
): Promise<ResponsiveIssue[]> {
  try {
    return await page.evaluate(
      ({ route, label }) => {
        const issues: ResponsiveIssue[] = [];
        const root = document.documentElement;
        if (!root || !document.body) {
          return issues;
        }
        const vw = root.clientWidth || window.innerWidth || 0;
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

        const isInsideOffscreenPanel = (node: HTMLElement): boolean => {
          let current: HTMLElement | null = node;
          while (current && current !== main && current !== document.body) {
            const style = window.getComputedStyle(current);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              Number(style.opacity) === 0 ||
              style.pointerEvents === "none" ||
              current.getAttribute("aria-hidden") === "true"
            ) {
              return true;
            }
            const rect = current.getBoundingClientRect();
            const fullyOffLeft = rect.right <= 0;
            const fullyOffRight = rect.left >= vw;
            if (fullyOffLeft || fullyOffRight) {
              return true;
            }
            current = current.parentElement;
          }
          return false;
        };

        const mainRect = main.getBoundingClientRect();
        if (vw < 1024 && mainRect.left > 12) {
          issues.push({
            route,
            label,
            issue: `marge fantôme sidebar: main.left=${Math.round(mainRect.left)}px sur viewport ${vw}px`,
          });
        }

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
          if (isInsideOffscreenPanel(el)) continue;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        route,
        label,
        issue: `audit DOM indisponible: ${message.slice(0, 120)}`,
      },
    ];
  }
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await warmupBackofficeRoutes(browser);
});

for (const viewport of VIEWPORTS) {
  test(`responsive backoffice complet — ${viewport.name}`, async ({ page }) => {
    test.setTimeout(900_000);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    const allIssues: ResponsiveIssue[] = [];

    for (const [route, label] of ROUTES) {
      await test.step(`${viewport.name} — ${label}`, async () => {
        try {
          await gotoBackofficePage(page, route, {
            waitUntil: "domcontentloaded",
            timeout: 120_000,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          allIssues.push({
            route,
            label,
            issue: `navigation impossible: ${message.slice(0, 160)}`,
          });
          return;
        }

        const mainVisible = await waitForBackofficeReady(page);

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
        await page
          .getByText(/Network Error|AxiosError/i)
          .first()
          .waitFor({ state: "hidden", timeout: 20_000 })
          .catch(() => {});
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
