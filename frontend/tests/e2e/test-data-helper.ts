import { APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:5002";
export const TEST_PREFIX = "E2ETEST";

let _cachedAdminToken = "";
let _cachedUserToken = "";
let _cachedUserCredentials: { email: string; password: string } | null = null;

function firstEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function requireEnvValue(keys: string[], label: string): string {
  const value = firstEnvValue(keys);
  if (!value) {
    throw new Error(
      `${label} manquant: renseigner une des variables ${keys.join(", ")}`,
    );
  }
  return value;
}

export function requireTestCredentials(
  credentials: { email: string; password: string } | null,
  label = "Identifiants utilisateur E2E",
): { email: string; password: string } {
  if (credentials?.email && credentials.password) return credentials;
  return getSeededUserCredentials(label);
}

export function getGeneratedUserPassword(
  label = "Mot de passe utilisateur créé par test E2E",
): string {
  return requireEnvValue(
    ["E2E_GENERATED_USER_PASSWORD", "TEST_USER_PASSWORD", "E2E_USER_PASSWORD"],
    label,
  );
}

/**
 * Token admin — pour les tests backoffice / administration.
 */
export async function getAdminToken(
  request: APIRequestContext,
): Promise<string> {
  if (_cachedAdminToken) return _cachedAdminToken;
  const credentials = getAdminCredentials();
  try {
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: credentials,
    });
    if (!resp.ok()) return "";
    const body = await resp.json();
    _cachedAdminToken = body.token || body.data?.token || "";
    return _cachedAdminToken;
  } catch {
    return "";
  }
}

/** Email/mot de passe de l'utilisateur seedé : variables env obligatoires, aucun secret en dur. */
export function getSeededUserCredentials(label = "Identifiants utilisateur seedé"): {
  email: string;
  password: string;
} {
  return {
    email: requireEnvValue(["TEST_USER_EMAIL", "E2E_USER_EMAIL"], `${label} email`),
    password: requireEnvValue(
      ["TEST_USER_PASSWORD", "E2E_USER_PASSWORD"],
      `${label} mot de passe`,
    ),
  };
}

export function getSeededUserAccounts(): Array<{
  email: string;
  password: string;
  name: string;
}> {
  const password = requireEnvValue(
    ["TEST_USER_PASSWORD", "E2E_USER_PASSWORD"],
    "Mot de passe comptes utilisateurs E2E",
  );
  const emails = firstEnvValue(["TEST_USER_EMAILS", "E2E_USER_EMAILS"])
    ?.split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (emails?.length) {
    return emails.map((email, index) => ({
      email,
      password,
      name: `User ${index + 1}`,
    }));
  }

  const user = getSeededUserCredentials();
  return [{ email: user.email, password: user.password, name: "User 1" }];
}

/**
 * Token utilisateur seedé — login direct sans inscription.
 * À utiliser en fallback pour les tests API E2E quand ensureTestUser échoue (worker isolé, etc.).
 */
export async function getSeededUserToken(
  request: APIRequestContext,
): Promise<string> {
  const credentials = getSeededUserCredentials();
  try {
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: credentials,
    });
    if (!resp.ok()) return "";
    const body = await resp.json();
    return body.token || body.data?.token || "";
  } catch {
    return "";
  }
}

/**
 * Token utilisateur classique — pour les tests fonctionnels (app mobile).
 * Crée un compte test puis se connecte ; si échec, tente le login avec l'utilisateur seedé.
 */
export async function getUserToken(
  request: APIRequestContext,
): Promise<string> {
  if (_cachedUserToken) return _cachedUserToken;
  const creds = await ensureTestUser(request);
  if (creds) return _cachedUserToken;
  const seeded = await getSeededUserToken(request);
  if (seeded) _cachedUserToken = seeded;
  return _cachedUserToken;
}

/**
 * Crée un utilisateur test (rôle USER) et retourne ses credentials.
 * Utile pour les tests Playwright UI qui ont besoin de remplir le formulaire de login.
 */
export async function ensureTestUser(
  request: APIRequestContext,
): Promise<{ email: string; password: string } | null> {
  if (_cachedUserCredentials && _cachedUserToken) return _cachedUserCredentials;
  const email = `e2e-user-${Date.now()}@jobbingtrack.test`;
  const password = requireEnvValue(
    ["E2E_GENERATED_USER_PASSWORD", "TEST_USER_PASSWORD", "E2E_USER_PASSWORD"],
    "Mot de passe utilisateur E2E généré",
  );
  try {
    const regResp = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email,
        password,
        firstName: "E2EUser",
        lastName: "Test",
        phone: "+33600000000",
      },
    });
    // 409 = utilisateur déjà existant (email unique), on tente quand même le login
    if (!regResp.ok() && regResp.status() !== 409) return null;
    const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (!resp.ok()) return null;
    const body = await resp.json();
    _cachedUserToken = body.token || body.data?.token || "";
    _cachedUserCredentials = { email, password };
    return _cachedUserCredentials;
  } catch {
    return null;
  }
}

/**
 * Credentials admin pour le login UI (formulaire Playwright).
 * Ne contient PAS le mot de passe en dur : variables env obligatoires.
 */
export function getAdminCredentials(): { email: string; password: string } {
  const adminEmail = firstEnvValue(["ADMIN_EMAIL"]);
  const testAdminEmail = firstEnvValue(["TEST_ADMIN_EMAIL"]);
  const email = testAdminEmail || adminEmail;

  if (!email) {
    throw new Error(
      "Email admin E2E manquant: renseigner une des variables TEST_ADMIN_EMAIL, ADMIN_EMAIL",
    );
  }

  // Le seed auth met à jour ADMIN_EMAIL avec ADMIN_PASSWORD. Si TEST_ADMIN_EMAIL
  // pointe vers le même compte, Playwright doit utiliser ce même mot de passe.
  const passwordKeys =
    testAdminEmail && adminEmail && testAdminEmail.toLowerCase() !== adminEmail.toLowerCase()
      ? ["TEST_ADMIN_PASSWORD"]
      : ["ADMIN_PASSWORD", "TEST_ADMIN_PASSWORD"];

  return {
    email,
    password: requireEnvValue(passwordKeys, "Mot de passe admin E2E"),
  };
}

/**
 * Login admin via le formulaire UI Playwright.
 * Utile pour les tests standalone qui ne bénéficient pas de storageState.
 */
export async function loginAsAdmin(
  page: import("@playwright/test").Page,
): Promise<void> {
  const creds = getAdminCredentials();
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/b4ck0ff1ce**", { timeout: 15000 }).catch(() => {});
}

/**
 * Adresse email réelle pour tester la réception des mails.
 * Configurée via TEST_REAL_EMAIL dans .env (gitignored).
 */
export const REAL_TEST_EMAIL = process.env.TEST_REAL_EMAIL?.trim() ?? "";

/**
 * @deprecated Utiliser getAdminToken() ou getUserToken() selon le contexte.
 */
export async function getAuthToken(
  request: APIRequestContext,
): Promise<string> {
  return getAdminToken(request);
}

export function uniqueId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function testCompanyName(suffix?: string): string {
  return `${TEST_PREFIX} Corp ${suffix || uniqueId()}`;
}

export function testContactName(suffix?: string): {
  firstName: string;
  lastName: string;
} {
  return {
    firstName: `${TEST_PREFIX}Prenom`,
    lastName: `Contact${suffix || uniqueId()}`,
  };
}

export async function apiCreateCompany(
  request: APIRequestContext,
  token: string,
  name?: string,
): Promise<{ id: string; name: string }> {
  const companyName = name || testCompanyName();
  try {
    const resp = await request.post(`${API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: companyName,
        industry: "E2E Testing",
        location: "Paris Test",
        size: "SMALL",
        website: "https://e2e-test.example.com",
        description: "Donnée de test E2E - suppression automatique",
      },
    });
    if (!resp.ok()) return { id: "", name: companyName };
    const body = await resp.json();
    const c = body.company || body.data?.company || body;
    return { id: c.id || "", name: companyName };
  } catch {
    return { id: "", name: companyName };
  }
}

export async function apiCreateContact(
  request: APIRequestContext,
  token: string,
  companyId: string,
  firstName?: string,
  lastName?: string,
): Promise<{ id: string; firstName: string; lastName: string }> {
  const fn = firstName || `${TEST_PREFIX}Prenom`;
  const ln = lastName || `Contact${uniqueId()}`;
  try {
    const resp = await request.post(`${API_URL}/api/v1/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: fn,
        lastName: ln,
        email: `e2e-${Date.now()}@test.jobbingtrack.local`,
        phone: "+33600000000",
        position: "Testeur E2E",
        companyId,
      },
    });
    if (!resp.ok()) return { id: "", firstName: fn, lastName: ln };
    const body = await resp.json();
    const c = body.contact || body.data?.contact || body;
    return { id: c.id || "", firstName: fn, lastName: ln };
  } catch {
    return { id: "", firstName: fn, lastName: ln };
  }
}

export async function apiDelete(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<void> {
  if (!id) return;
  try {
    await request.delete(`${API_URL}/api/v1/${endpoint}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* noop */
  }
}

export async function apiCreateApplication(
  request: APIRequestContext,
  token: string,
  companyId: string,
  position?: string,
): Promise<{ id: string; position: string }> {
  const pos = position || `${TEST_PREFIX} Dev ${uniqueId()}`;
  try {
    const resp = await request.post(`${API_URL}/api/v1/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        companyId,
        position: pos,
        contractType: "CDI",
        status: "CANDIDATE_PENDING",
      },
    });
    if (!resp.ok()) return { id: "", position: pos };
    const body = await resp.json();
    const a = body.application || body.data?.application || body;
    return { id: a.id || "", position: pos };
  } catch {
    return { id: "", position: pos };
  }
}

export async function apiCreateInterview(
  request: APIRequestContext,
  token: string,
  applicationId: string,
): Promise<{ id: string }> {
  try {
    const resp = await request.post(`${API_URL}/api/v1/interviews`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        applicationId,
        interviewDate: new Date(Date.now() + 86400000).toISOString(),
        status: "SCHEDULED",
      },
    });
    if (!resp.ok()) return { id: "" };
    const body = await resp.json();
    return { id: body.interview?.id || "" };
  } catch {
    return { id: "" };
  }
}

/** Réponse détaillée pour archive/unarchive/restore (pour logs en cas d'échec). */
export async function apiArchiveWithResponse(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  if (!id) return { ok: false, status: 0 };
  try {
    const resp = await request.post(
      `${API_URL}/api/v1/${endpoint}/${id}/archive`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      },
    );
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok(), status: resp.status(), body };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

export async function apiArchive(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  const r = await apiArchiveWithResponse(request, token, endpoint, id);
  return r.ok;
}

/** Réponse détaillée pour unarchive (pour logs en cas d'échec). */
export async function apiUnarchiveWithResponse(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  if (!id) return { ok: false, status: 0 };
  try {
    const resp = await request.post(
      `${API_URL}/api/v1/${endpoint}/${id}/unarchive`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      },
    );
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok(), status: resp.status(), body };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

export async function apiUnarchive(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  const r = await apiUnarchiveWithResponse(request, token, endpoint, id);
  return r.ok;
}

export async function apiRestoreWithResponse(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  if (!id) return { ok: false, status: 0 };
  try {
    const resp = await request.post(
      `${API_URL}/api/v1/${endpoint}/${id}/restore`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok(), status: resp.status(), body };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

export async function apiRestore(
  request: APIRequestContext,
  token: string,
  endpoint: string,
  id: string,
): Promise<boolean> {
  const r = await apiRestoreWithResponse(request, token, endpoint, id);
  return r.ok;
}

export async function cleanupTestData(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  if (!token) return;

  try {
    const resp = await request.get(`${API_URL}/api/v1/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok()) {
      const body = await resp.json();
      const contacts = body.contacts || body.data?.contacts || body.data || [];
      for (const c of contacts) {
        if (
          c.firstName?.includes(TEST_PREFIX) ||
          c.lastName?.includes(TEST_PREFIX)
        ) {
          await apiDelete(request, token, "contacts", c.id);
        }
      }
    }
  } catch {
    /* noop */
  }

  try {
    const resp = await request.get(`${API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok()) {
      const body = await resp.json();
      const companies =
        body.companies || body.data?.companies || body.data || [];
      for (const c of companies) {
        if (c.name?.includes(TEST_PREFIX)) {
          await apiDelete(request, token, "companies", c.id);
        }
      }
    }
  } catch {
    /* noop */
  }
}
