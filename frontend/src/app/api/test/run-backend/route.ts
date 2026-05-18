import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import {
  getProjectRoot,
  isRunningInFrontendContainer,
} from "../testRunnerUtils";

const RUN_TIMEOUT_MS = 120000;

const TESTS_TAG = "[TESTS BACKEND]";

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/);
  return match ? match[0] : null;
}

export async function POST(request: NextRequest) {
  console.log(
    `${TESTS_TAG} Démarrage des Tests Backend depuis le backoffice — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
  );
  try {
    const body = await request.json().catch(() => ({}));
    const testName = body.testName || "Tests Backend";
    const projectRoot = getProjectRoot();
    const scriptPath = `${projectRoot}/scripts/reports/generate-test-report.sh`;
    const inContainer = isRunningInFrontendContainer();
    const testCommand = inContainer
      ? "cd /app/tests && npm run test:backend"
      : "make test-backend";
    const command = `cd "${projectRoot}" && sh "${scriptPath}" backend "${testCommand}" "${testName}"`;

    let stdout = "";
    let reportId: string | null = null;
    try {
      stdout = execSync(command, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: RUN_TIMEOUT_MS,
        env: {
          ...process.env,
          TESTS_RESULTS_DIR: process.env.TESTS_RESULTS_DIR || undefined,
        },
      });
      reportId = extractReportId(stdout);
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; message?: string };
      reportId = execErr.stdout ? extractReportId(execErr.stdout) : null;
      console.log(
        `${TESTS_TAG} Fin (échec) — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId ?? "N/A"}`,
      );
      if (reportId) {
        return NextResponse.json({
          success: false,
          message: "Tests terminés avec des échecs",
          reportId,
          reportLocation: "tests/results/",
          error: (err as Error).message || "Erreur exécution tests backend",
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: (err as Error).message || "Erreur exécution tests backend",
          reportId: undefined,
        },
        { status: 500 },
      );
    }

    console.log(
      `${TESTS_TAG} Fin — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId ?? "N/A"}`,
    );
    return NextResponse.json({
      success: true,
      message: "Rapport généré",
      reportId,
      reportLocation: "tests/results/",
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
