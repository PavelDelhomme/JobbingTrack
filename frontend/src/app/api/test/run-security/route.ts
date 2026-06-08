import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import {
  getProjectRoot,
  isRunningInFrontendContainer,
} from "../testRunnerUtils";

const RUN_TIMEOUT_MS = 120000;

const TESTS_TAG = "[TESTS SECURITY]";

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/);
  return match ? match[0] : null;
}

export async function POST(request: NextRequest) {
  console.log(
    `${TESTS_TAG} Démarrage des Tests Sécurité depuis le backoffice — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
  );
  try {
    const body = await request.json().catch(() => ({}));
    const testName = body.testName || "Tests Sécurité";
    const projectRoot = getProjectRoot();
    const scriptPath = `${projectRoot}/scripts/reports/generate-test-report.sh`;
    const inContainer = isRunningInFrontendContainer();
    const testCommand = inContainer
      ? "cd /app/tests && node security/test-security.js"
      : "make test-security";
    const command = `cd "${projectRoot}" && sh "${scriptPath}" security "${testCommand}" "${testName}"`;

    let stdout = "";
    let reportId: string | null = null;
    let exitCode = 0;
    try {
      stdout = execSync(command, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env: {
          ...process.env,
          API_GATEWAY_URL:
            process.env.API_GATEWAY_URL ||
            (inContainer ? "http://api-gateway:3000" : undefined),
          TESTS_RESULTS_DIR:
            process.env.TESTS_RESULTS_DIR ||
            (inContainer ? "/tmp/tests/results" : undefined),
          METRICS_AGGREGATOR_INTERNAL_URL:
            process.env.METRICS_AGGREGATOR_INTERNAL_URL ||
            "http://jobbingtrack-metrics-aggregator:3014",
        },
      });
      reportId = extractReportId(stdout);
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; status?: number };
      stdout = execErr.stdout ?? "";
      reportId = stdout ? extractReportId(stdout) : null;
      exitCode = execErr.status ?? 1;
      console.log(
        `${TESTS_TAG} Fin (exit ${exitCode}) — rapport: ${reportId ?? "N/A"}`,
      );
      if (!reportId) {
        return NextResponse.json(
          {
            success: false,
            error:
              (err as Error).message || "Erreur exécution tests sécurité",
            outputTail: stdout.slice(-3000),
          },
          { status: 500 },
        );
      }
    }

    const hasCriticalHigh = /CRITIQUES:\s*[1-9]|HAUTES:\s*[1-9]/i.test(stdout);
    const hasMediumLow = /MOYENNES:\s*[1-9]|BASSES:\s*[1-9]/i.test(stdout);

    console.log(
      `${TESTS_TAG} Fin — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId ?? "N/A"}`,
    );
    return NextResponse.json({
      success: !hasCriticalHigh && exitCode === 0,
      warning: hasMediumLow && !hasCriticalHigh,
      message: hasCriticalHigh
        ? "Tests terminés — vulnérabilités critical/high détectées"
        : hasMediumLow
          ? "Tests terminés — avertissements medium/low (niveau acceptable)"
          : "Tests sécurité applicatifs terminés",
      reportId,
      reportLocation: "tests/results/",
      reportKind: "security-app-tests",
      hint: "Pour le scan CVE dépendances (npm/Rust/Docker), utilisez « Scan CVE ».",
      outputTail: stdout.slice(-2500),
    });
  } catch (error: unknown) {
    console.log(
      `${TESTS_TAG} Fin (erreur) — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
