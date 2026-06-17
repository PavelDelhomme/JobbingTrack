import { defineConfig, devices } from "@playwright/test";
import path from "path";
import baseConfig from "./playwright.config";

const authFile = path.join(__dirname, "tests/e2e/.auth/admin.json");

const ciExtraIgnores = [
  /email-verification-monitor\.spec\.ts/,
  /crash-reporting\.spec\.ts/,
  /performance-e2e\.spec\.ts/,
  /performances-range-smoke\.spec\.ts/,
];

/**
 * Playwright CI : config principale + exclusions specs MailHog / stack Docker complète.
 */
export default defineConfig({
  ...baseConfig,
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
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
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
        ...ciExtraIgnores,
      ],
    },
  ],
});
