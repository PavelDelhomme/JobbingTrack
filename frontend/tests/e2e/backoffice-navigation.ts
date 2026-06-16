import fs from "fs";
import path from "path";
import type { Browser, Page } from "@playwright/test";

/** Routes qui compilent tard et déclenchent souvent un restart Next dev en fin de campagne. */
export const BACKOFFICE_HEAVY_ROUTES = [
  "/backoffice/search",
  "/backoffice/tests-frontend",
  "/backoffice/user-journey/custom",
  "/backoffice/api-tester",
  "/backoffice/performance-tests",
  "/backoffice/performance-tests/schedule",
  "/backoffice/test-data",
  "/backoffice/emails/templates",
  "/backoffice/services/api-gateway",
  "/backoffice/followups",
  "/backoffice/datas?tab=billing",
  "/backoffice/statistics",
  "/backoffice/tests",
] as const;

const RETRYABLE_GOTO =
  /ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED|ERR_ABORTED|net::ERR_/i;

export async function gotoBackofficePage(
  page: Page,
  url: string,
  options?: Parameters<Page["goto"]>[1],
) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, options);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!RETRYABLE_GOTO.test(message) || attempt === maxAttempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
}

export async function warmupBackofficeRoutes(browser: Browser) {
  if (process.env.PLAYWRIGHT_SKIP_BACKOFFICE_WARMUP === "1") return;

  const storagePath = path.join(__dirname, ".auth/admin.json");
  if (!fs.existsSync(storagePath)) {
    console.warn(
      "backoffice warmup: session admin absente, compilation anticipée ignorée",
    );
    return;
  }

  const context = await browser.newContext({
    storageState: storagePath,
  });
  const page = await context.newPage();

  for (const route of BACKOFFICE_HEAVY_ROUTES) {
    try {
      await gotoBackofficePage(page, route, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`backoffice warmup: ${route} — ${message}`);
    }
  }

  await context.close();
}
