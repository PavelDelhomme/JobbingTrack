import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { loadRootEnv } from "./tests/e2e/loadRootEnv";
import { applyPlaywrightRuntimeEnv } from "./tests/e2e/playwright-runtime-env";

loadRootEnv();
applyPlaywrightRuntimeEnv(__dirname);

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5003";
const reportDir = process.env.REPORT_DIR || "";
const outputDir = reportDir
  ? path.join(reportDir, "test-results")
  : "test-results";
const htmlReportDir = reportDir
  ? path.join(reportDir, "playwright-report")
  : "playwright-report";
const jsonReportPath = reportDir
  ? path.join(reportDir, "test-results.json")
  : "test-results.json";
const junitReportPath = reportDir
  ? path.join(reportDir, "test-results.xml")
  : "test-results.xml";

const authFile = path.join(__dirname, "tests/e2e/.auth/admin.json");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir,
  // Les pages Next peuvent nécessiter une compilation à chaud pendant les E2E.
  // Sans timeout élargi, `page.goto()` / `waitForURL()` échouent avant que l'UI soit visible.
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.PLAYWRIGHT_WORKERS
    ? parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
    : 1,
  reporter: [
    ["html", { outputFolder: htmlReportDir }],
    ["json", { outputFile: jsonReportPath }],
    ["junit", { outputFile: junitReportPath }],
    process.env.CI ? ["github"] : ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 90_000,
    // Les actions UI peuvent nécessiter quelques secondes sur les pages lourdes.
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "no-auth",
      testMatch: [/login\.spec\.ts/, /accessibility\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
      testIgnore: [
        /auth\.setup\.ts/,
        /login\.spec\.ts/,
        /accessibility\.spec\.ts/,
        /complete-user-journey\.spec\.ts/,
        /mobile-app\.spec\.ts/,
        /user-experience\.spec\.ts/,
        /impersonation-tests\.spec\.ts/,
        /mobile\//,
        /api-only-tests\.spec\.ts/,
        /api-critiques\.spec\.ts/,
        /admin-features\.spec\.ts/,
        /application-workflow\.spec\.ts/,
        /advanced-security\.spec\.ts/,
        /security-tests\.spec\.ts/,
        /load-tests\.spec\.ts/,
        /data-management\.spec\.ts/,
        /export-import-advanced\.spec\.ts/,
        /integration-tests\.spec\.ts/,
        /performance-tests\.spec\.ts/,
      ],
    },
  ],
  // Frontend Docker (port 5003 par défaut) doit être démarré avant la campagne.
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
});
