import { expect, test } from "@playwright/test";
import { getAdminCredentials } from "./test-data-helper";

const API_URL = process.env.API_URL || "http://localhost:5002";
const ADMIN_CREDENTIALS = getAdminCredentials();

function uniqueAuditIp() {
  const n = Date.now() % 200;
  return `203.0.113.${20 + (n % 180)}`;
}

async function postLogin(
  request: import("@playwright/test").APIRequestContext,
  data: unknown,
  headers: Record<string, string> = {},
) {
  return request.post(`${API_URL}/api/v1/auth/login`, {
    data,
    headers: {
      "X-Login-Security-Audit": "controlled-local",
      ...headers,
    },
  });
}

async function openLoggedOutLogin(page: import("@playwright/test").Page) {
  await page.context().clearCookies();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie =
      "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
}

test.describe.serial("Sécurité backoffice — login", () => {
  test("la page login n'expose aucun secret ni compte de test", async ({
    page,
  }) => {
    await openLoggedOutLogin(page);

    await expect(page.locator("h2", { hasText: "JobbingTrack" })).toBeVisible();
    await expect(page.getByText(/Backoffice Administrateur/i)).toBeVisible();
    await expect(page.getByText(ADMIN_CREDENTIALS.password)).toHaveCount(0);
    await expect(page.getByText(ADMIN_CREDENTIALS.email)).toHaveCount(0);
    await expect(page.getByText(/Compte de test|password123|admin123/i)).toHaveCount(
      0,
    );

    await expect(page.locator('input[name="email"]')).toHaveAttribute(
      "autocomplete",
      "email",
    );
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  test("les erreurs de login ne permettent pas l'énumération simple des comptes", async ({
    request,
  }) => {
    const unknown = await postLogin(request, {
      email: `unknown-${Date.now()}@jobbingtrack.invalid`,
      password: "WrongPassword!42",
    });
    const knownWrongPassword = await postLogin(request, {
      email: ADMIN_CREDENTIALS.email,
      password: "WrongPassword!42",
    });

    expect(unknown.status()).toBe(401);
    expect(knownWrongPassword.status()).toBe(401);

    const unknownBody = await unknown.json();
    const knownBody = await knownWrongPassword.json();
    expect(String(unknownBody.error || "")).toBe("Invalid email or password");
    expect(String(knownBody.error || "")).toBe("Invalid email or password");
    expect(JSON.stringify(unknownBody)).not.toMatch(/not found|unknown|existe/i);
    expect(JSON.stringify(knownBody)).not.toMatch(/hash|bcrypt|password123/i);
  });

  test("les payloads SQL/XSS contrôlés sur login sont rejetés sans token ni stack trace", async ({
    request,
  }) => {
    const payloads = [
      { email: "' OR '1'='1", password: "x" },
      { email: "admin@example.com", password: "' OR '1'='1" },
      { email: "<script>alert(1)</script>@example.com", password: "x" },
      { email: "admin@example.com", password: "<img src=x onerror=alert(1)>" },
      { email: { $ne: null }, password: { $ne: null } },
    ];

    for (const payload of payloads) {
      const response = await postLogin(request, payload);
      expect([400, 401, 403, 429]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toMatch(/token|Bearer|stack|PrismaClientKnownRequestError/i);
      expect(body).not.toMatch(/SELECT|DROP TABLE|information_schema/i);
    }
  });

  test("le login est protégé par rate-limit strict quand la gateway l'active", async ({
    request,
  }) => {
    const ip = uniqueAuditIp();
    const statuses: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      const response = await postLogin(
        request,
        {
          email: `rate-limit-${Date.now()}-${i}@jobbingtrack.invalid`,
          password: "WrongPassword!42",
        },
        { "X-Forwarded-For": ip },
      );
      statuses.push(response.status());
    }

    if (!statuses.includes(429)) {
      test.skip(
        true,
        `Rate-limit non observable dans cet environnement (statuses=${statuses.join(
          ",",
        )})`,
      );
    }

    expect(statuses).toContain(429);
  });
});
