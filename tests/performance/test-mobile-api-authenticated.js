/**
 * Charge API mobile authentifiée — endpoints métier CRUD/liste via token USER seedé.
 * Complète test-performance.js qui ne valide souvent que le périmètre 401 sans token.
 *
 * Usage :
 *   node tests/performance/test-mobile-api-authenticated.js
 *   PERF_LIGHT=1 node tests/performance/test-mobile-api-authenticated.js
 *
 * Prérequis : stack gateway + auth-service up ; seed auth avec testuser@jobbingtrack.test
 */

const axios = require("axios");
const { performance } = require("perf_hooks");
const { getTestUser, API_URL } = require("../helpers/auth.helper");

const MOBILE_ENDPOINTS = [
  { path: "/api/v1/auth/profile", method: "GET", label: "Profil utilisateur" },
  { path: "/api/v1/applications?limit=20", method: "GET", label: "Candidatures" },
  { path: "/api/v1/companies?limit=20", method: "GET", label: "Entreprises" },
  { path: "/api/v1/contacts?limit=20", method: "GET", label: "Contacts" },
  { path: "/api/v1/followups?limit=20", method: "GET", label: "Relances" },
  { path: "/api/v1/interviews?limit=20", method: "GET", label: "Entretiens" },
  { path: "/api/v1/calls?limit=20", method: "GET", label: "Appels" },
  { path: "/api/v1/events?limit=20", method: "GET", label: "Événements" },
  { path: "/api/v1/notifications?limit=20", method: "GET", label: "Notifications" },
];

class MobileAuthenticatedApiTester {
  constructor(headers) {
    this.headers = headers;
    this.baseUrl = API_URL;
    this.metrics = [];
  }

  async measure(endpoint, method = "GET", label = endpoint) {
    const start = performance.now();
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: this.headers,
        timeout: 15_000,
        validateStatus: () => true,
      });
      const duration = performance.now() - start;
      const ok = response.status >= 200 && response.status < 300;
      this.metrics.push({
        label,
        endpoint,
        method,
        status: response.status,
        duration,
        ok,
      });
      return { ok, status: response.status, duration };
    } catch (error) {
      const duration = performance.now() - start;
      this.metrics.push({
        label,
        endpoint,
        method,
        status: 0,
        duration,
        ok: false,
        error: error.message,
      });
      return { ok: false, status: 0, duration, error: error.message };
    }
  }

  async runSequential() {
    const results = [];
    for (const ep of MOBILE_ENDPOINTS) {
      const result = await this.measure(ep.path, ep.method, ep.label);
      results.push({ ...ep, ...result });
      const icon = result.ok ? "✅" : "❌";
      console.log(
        `   ${ep.label}: ${icon} ${result.status || "ERR"} — ${Math.round(result.duration)}ms`,
      );
      await new Promise((r) => setTimeout(r, 40));
    }
    return results;
  }

  async runLightLoad() {
    const light =
      process.env.PERF_LIGHT === "1" || process.env.CI === "true";
    const targets = light
      ? MOBILE_ENDPOINTS.slice(0, 5)
      : MOBILE_ENDPOINTS;
    const concurrency = light ? 2 : 3;
    console.log(
      `🔥 Charge légère authentifiée (${targets.length} endpoints × ${concurrency} requêtes)...`,
    );

    let totalOk = 0;
    let total = 0;
    for (const ep of targets) {
      const batch = await Promise.all(
        Array.from({ length: concurrency }, () =>
          this.measure(ep.path, ep.method, ep.label),
        ),
      );
      const ok = batch.filter((r) => r.ok).length;
      totalOk += ok;
      total += batch.length;
      console.log(`   ${ep.label}: ${ok}/${batch.length} OK`);
      await new Promise((r) => setTimeout(r, light ? 80 : 150));
    }
    return { totalOk, total, successRate: total > 0 ? (totalOk / total) * 100 : 0 };
  }

  summarize(results) {
    const ok = results.filter((r) => r.ok).length;
    const avg =
      results.reduce((sum, r) => sum + r.duration, 0) / (results.length || 1);
    return { ok, total: results.length, avg };
  }
}

async function main() {
  console.log("📱 Tests API mobile authentifiée\n");
  console.log(`   Gateway: ${API_URL}`);

  let user;
  try {
    user = await getTestUser();
    console.log(`   Utilisateur: ${user.email} (${user.role})\n`);
  } catch (error) {
    console.error(`❌ Auth mobile impossible: ${error.message}`);
    console.error(
      "   Exécutez le seed auth : docker exec jobbingtrack-auth-service npx prisma db seed",
    );
    process.exit(1);
  }

  const tester = new MobileAuthenticatedApiTester(user.headers);

  console.log("⚡ Endpoints métier (token Bearer)...");
  const sequential = await tester.runSequential();
  const summary = tester.summarize(sequential);
  console.log(
    `\n📊 Séquentiel: ${summary.ok}/${summary.total} OK, moyenne ${Math.round(summary.avg)}ms`,
  );

  const load = await tester.runLightLoad();
  console.log(
    `📊 Charge: ${load.totalOk}/${load.total} OK (${load.successRate.toFixed(1)}%)`,
  );

  const failed = sequential.filter((r) => !r.ok);
  if (failed.length > 0 || load.totalOk < load.total) {
    console.log("\n⚠️ Au moins un endpoint authentifié a échoué.");
    process.exit(1);
  }

  console.log("\n✅ Campagne API mobile authentifiée OK");
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌", error.message);
    process.exit(1);
  });
}

module.exports = { MobileAuthenticatedApiTester, MOBILE_ENDPOINTS };
