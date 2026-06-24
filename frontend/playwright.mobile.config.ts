import { defineConfig, devices } from "@playwright/test";
import { findFreePort, killProcessOnPort } from "./tests/utils/portUtils";

/**
 * Configuration Playwright pour Tests Mobile - JobbingTrack
 * Tests E2E complets pour l'application mobile avec simulation d'appareils
 */
export default defineConfig({
  testDir: "./tests/e2e/mobile",
  fullyParallel: false, // Tests mobiles séquentiels pour éviter les conflits
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Un seul worker pour les tests mobiles

  timeout: 60000, // 60 secondes pour les tests mobiles (plus lents)
  expect: {
    timeout: 15000,
  },

  reporter: [
    ["html", { outputFolder: "playwright-report-mobile" }],
    ["json", { outputFile: "test-results-mobile.json" }],
    ["list"],
    ["line"],
  ],

  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Timeouts pour éviter les échecs trop rapides
    actionTimeout: 10000,
    navigationTimeout: 30000,
    viewport: { width: 375, height: 667 }, // iPhone SE par défaut
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // Simuler les caractéristiques mobiles
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    // Permissions mobiles
    permissions: ["geolocation", "notifications"],
    geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris
    colorScheme: "light",
  },

  projects: [
    // iPhone 13 Pro — viewport iOS + moteur Chromium (channel sur WebKit = erreur Playwright)
    {
      name: "iPhone 13 Pro",
      use: {
        ...devices["iPhone 13 Pro"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        browserName: "chromium",
      },
    },

    // iPhone SE (petit écran)
    {
      name: "iPhone SE",
      use: {
        ...devices["iPhone SE"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        browserName: "chromium",
      },
    },

    // iPhone 12 Pro Max (grand écran)
    {
      name: "iPhone 12 Pro Max",
      use: {
        ...devices["iPhone 12 Pro Max"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        viewport: { width: 428, height: 926 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        browserName: "chromium",
      },
    },

    // Pixel 5 (Android)
    {
      name: "Pixel 5",
      use: {
        ...devices["Pixel 5"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
      },
    },

    // Galaxy S21 (Android)
    {
      name: "Galaxy S21",
      use: {
        ...devices["Galaxy S21"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36",
      },
    },

    // Mode paysage
    {
      name: "iPhone 13 Pro Landscape",
      use: {
        ...devices["iPhone 13 Pro landscape"],
        baseURL: process.env.FRONTEND_URL || "http://localhost:5003",
        isMobile: true,
        hasTouch: true,
        browserName: "chromium",
      },
    },
  ],

  ...(process.env.CI
    ? {
        webServer: {
          command: "npm run dev",
          url: process.env.FRONTEND_URL || "http://localhost:5003",
          reuseExistingServer: false,
          timeout: 120000,
        },
      }
    : {}),
});
