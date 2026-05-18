import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getProjectRoot,
  isRunningInFrontendContainer,
} from "../testRunnerUtils";

const RUN_TIMEOUT_MS = 120000; // 2 min

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/);
  return match ? match[0] : null;
}

function readSummary(
  reportId: string | null,
): { total: number; passed: number; failed: number; skipped: number } | null {
  if (!reportId) return null;
  try {
    const projectRoot = getProjectRoot();
    const resultsDir =
      process.env.TESTS_RESULTS_DIR || join(projectRoot, "tests", "results");
    const summaryPath = join(resultsDir, reportId, "summary.json");
    if (!existsSync(summaryPath)) return null;
    const raw = readFileSync(summaryPath, "utf-8");
    const data = JSON.parse(raw) as {
      summary?: {
        totalTests?: number;
        totalPassed?: number;
        totalFailed?: number;
        totalSkipped?: number;
      };
    };
    const s = data?.summary;
    if (!s) return null;
    return {
      total: s.totalTests ?? 0,
      passed: s.totalPassed ?? 0,
      failed: s.totalFailed ?? 0,
      skipped: s.totalSkipped ?? 0,
    };
  } catch {
    return null;
  }
}

/** URL de l’API pour les scripts de test. En Docker (frontend), utiliser le service api-gateway sur le réseau interne. */
function getApiUrlForTests(): string {
  const envUrl = process.env.API_GATEWAY_URL || process.env.API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  const root = process.env.PROJECT_ROOT || "";
  if (root === "/app") return "http://api-gateway:3000";
  return "http://localhost:5002";
}

export async function POST(request: NextRequest) {
  // Log visible dans les logs du conteneur frontend quand on lance les Tests API depuis le backoffice
  const startLabel = `[TESTS API] Démarrage des Tests API depuis le backoffice — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`;
  console.log(startLabel);

  try {
    const body = await request.json().catch(() => ({}));
    const testName = body.testName || "Tests API";
    const tests = body.tests || []; // Liste des tests à exécuter (health, contacts, etc.)

    const projectRoot = getProjectRoot();
    const scriptDir = `${projectRoot}/scripts`;
    const inContainer = isRunningInFrontendContainer();
    let testCommand: string;
    if (tests && tests.length > 0) {
      const testTypes = tests.join(",");
      testCommand = `sh "${scriptDir}/test-api-specific.sh" "${testTypes}"`;
    } else if (inContainer) {
      // En Docker pas de make : exécuter les tests API directement (équivalent de make test-api)
      testCommand =
        "cd /app/tests && npm test -- api/ --verbose --forceExit --no-coverage 2>&1";
    } else {
      testCommand = "make test-api";
    }
    // Passer la commande entre guillemets simples pour que le shell transmette un seul argument à generate-test-report.sh
    const safeCommand = testCommand.replace(/'/g, "'\"'\"'");
    const safeName = (testName || "").toString().replace(/"/g, '\\"');

    const command = `cd "${projectRoot}" && sh "${scriptDir}/generate-test-report.sh" api '${safeCommand}' "${safeName}"`;

    const apiUrl = getApiUrlForTests();
    const metricsAggregatorUrl =
      process.env.METRICS_AGGREGATOR_URL ||
      (process.env.PROJECT_ROOT === "/app"
        ? "http://jobbingtrack-metrics-aggregator:3014"
        : "http://localhost:5004");
    const tz = process.env.TZ || process.env.NEXT_PUBLIC_TZ || "Europe/Paris";
    const env = {
      ...process.env,
      API_URL: apiUrl,
      METRICS_AGGREGATOR_URL: metricsAggregatorUrl,
      TZ: tz,
    };

    let stdout = "";
    let reportId: string | null = null;
    try {
      stdout = execSync(command, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env,
      });
      reportId = extractReportId(stdout);
    } catch (err: unknown) {
      const execErr = err as {
        stdout?: string;
        stderr?: string;
        message?: string;
        status?: number;
      };
      stdout = execErr.stdout || "";
      reportId = extractReportId(stdout);
      const summary = reportId ? readSummary(reportId) : null;
      const friendlyError =
        summary && (summary.failed ?? 0) > 0
          ? `Certains tests ont échoué (${summary.failed}/${summary.total}). Consultez le rapport ci-dessous.`
          : execErr.message || "Erreur lors de l’exécution des tests";
      // Si un rapport a tout de même été généré (script a écrit le rapport puis exit 1), retourner 200 pour permettre de l’ouvrir
      if (reportId) {
        console.log(
          `[TESTS API] Fin des Tests API (échec partiel) — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId}`,
        );
        return NextResponse.json(
          {
            success: false,
            error: friendlyError,
            reportId,
            reportLocation: "tests/results/",
            selectedTests: tests,
            summary: summary ?? undefined,
          },
          { status: 200 },
        );
      }
      console.log(
        `[TESTS API] Fin des Tests API (erreur) — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: friendlyError,
          reportId: undefined,
          selectedTests: tests,
        },
        { status: 500 },
      );
    }

    const endLabel = `[TESTS API] Fin des Tests API — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId ?? "N/A"}`;
    console.log(endLabel);

    const summary = reportId ? readSummary(reportId) : null;
    return NextResponse.json({
      success: true,
      message: `Rapport généré${tests.length > 0 ? ` (${tests.length} test(s))` : ""}`,
      reportId,
      reportLocation: "tests/results/",
      selectedTests: tests,
      summary: summary ?? undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const endLabel = `[TESTS API] Fin des Tests API (erreur) — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`;
    console.log(endLabel);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
