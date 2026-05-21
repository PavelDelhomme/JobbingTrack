import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { e2eGatewayBaseUrl } from "../../../tests/e2e/helpers/gatewayUrl";

const ADMIN_EMAIL =
  process.env.TEST_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "admin@jobbingtrack.com";
const ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  "password123";
const API_GATEWAY_URL = e2eGatewayBaseUrl();

export const AUTH_FILE = path.join(__dirname, ".auth", "admin.json");

test("authenticate as admin", async ({ page, request }) => {
  test.setTimeout(90_000);

  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Évite la fragilité UI du setup: login API puis injection token/cookie.
  const loginRes = await request.post(`${API_GATEWAY_URL}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(
    loginRes.ok(),
    `Login API admin KO: ${loginRes.status()}`,
  ).toBeTruthy();
  const body = await loginRes.json();
  const token = body?.token;
  expect(typeof token === "string" && token.length > 10).toBeTruthy();

  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.evaluate((t) => {
    localStorage.setItem("token", t);
    document.cookie = `token=${t}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }, token);

  await page.goto("/b4ck0ff1ce", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect
    .poll(
      async () => {
        const hasToken = await page.evaluate(
          () =>
            !!(
              localStorage.getItem("token") || sessionStorage.getItem("token")
            ),
        );
        const isBackoffice = page.url().includes("/b4ck0ff1ce");
        const hasMain = await page
          .locator("main")
          .first()
          .isVisible()
          .catch(() => false);
        return hasToken && (isBackoffice || hasMain);
      },
      { timeout: 60_000, intervals: [500, 1000, 2000] },
    )
    .toBeTruthy();

  await page.context().storageState({ path: AUTH_FILE });
});
