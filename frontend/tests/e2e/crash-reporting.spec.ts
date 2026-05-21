/**
 * Tests E2E Playwright — Systeme de Crash Reporting (route dediee gateway)
 *
 * Endpoint : POST /api/v1/crashes (sans auth, enregistrement fichier)
 * Teste : envoi crash report, validation crashType/message, acceptation sans auth, types multiples
 */
import { test, expect } from "@playwright/test";
import {
  getUserToken,
  ensureTestUser,
  getAdminToken,
} from "./test-data-helper";

const API_URL =
  process.env.API_URL || process.env.API_GATEWAY_URL || "http://localhost:5002";
const GATEWAY_CRASH_URL = `${API_URL}/api/v1/crashes`;

test.describe("Crash Reporting (E2E API - Gateway)", () => {
  let token: string | null = null;

  test.beforeAll(async ({ request }) => {
    await ensureTestUser(request);
    token = await getUserToken(request);
    if (!token) {
      token = await getAdminToken(request);
    }
  });

  test("Envoi crash report complet (sans auth)", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: {
        crashType: "FlutterError",
        message: "RangeError: Invalid index at position 5",
        stackTrace: "at main.dart:42\nat framework.dart:4950",
        deviceInfo: {
          platform: "android",
          osVersion: "14",
          deviceModel: "Pixel 7",
          appVersion: "1.0.0",
          screenSize: "1080x2400",
          locale: "fr_FR",
        },
        screenName: "CandidatureDetailPage",
        sessionId: `e2e-session-${Date.now()}`,
        userActions: ["tap Candidatures", "scroll down", "tap item"],
        metadata: { testId: "playwright-e2e" },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.file).toBeDefined();
    expect(body.file).toMatch(/^crash-/);
  });

  test("Envoi crash report minimal", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: {
        crashType: "MinimalError",
        message: "Test crash minimal E2E",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.file).toBeDefined();
  });

  test("Rejet sans crashType", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: { message: "Missing type" },
    });

    expect(res.status()).toBe(400);
  });

  test("Rejet sans message", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: { crashType: "TestError" },
    });

    expect(res.status()).toBe(400);
  });

  test("Accepte sans authentification", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: { crashType: "NoAuth", message: "Should succeed without token" },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.file).toBeDefined();
  });

  test("Envoi de plusieurs types de crash", async ({ request }) => {
    const types = ["UncaughtError", "NetworkError", "TimeoutError"];

    for (const crashType of types) {
      const res = await request.post(GATEWAY_CRASH_URL, {
        data: {
          crashType,
          message: `E2E test: ${crashType}`,
          deviceInfo: { platform: "android", osVersion: "14" },
        },
      });

      expect(res.status()).toBe(201);
    }
  });

  test("Message tres long accepte", async ({ request }) => {
    const res = await request.post(GATEWAY_CRASH_URL, {
      data: {
        crashType: "LongError",
        message: "X".repeat(2000),
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.file).toBeDefined();
  });
});
