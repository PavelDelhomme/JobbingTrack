import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjectRoot } from "../testRunnerUtils";

const RUN_TIMEOUT_MS = 120000;
const TESTS_TAG = "[TESTS CONTROLLED OFFENSIVE]";

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/controlled-offensive\/(\d{8}-\d{6})/);
  if (match) return `controlled-offensive-${match[1]}`;

  const fallback = stdout.match(/\d{8}-\d{6}/);
  return fallback ? `controlled-offensive-${fallback[0]}` : null;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

export async function POST(request: NextRequest) {
  console.log(
    `${TESTS_TAG} Démarrage périmètre tests offensifs contrôlés — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
  );

  try {
    await request.json().catch(() => ({}));
    const projectRoot = getProjectRoot();
    const command = `cd "${projectRoot}" && bash scripts/security/run-controlled-offensive-lab-scope-with-report.sh`;

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
          SECURITY_TEST_TARGET:
            process.env.SECURITY_TEST_TARGET || "http://localhost:5002",
          SECURITY_TEST_ENV: process.env.SECURITY_TEST_ENV || "local",
        },
      });
      reportId = extractReportId(stdout);
    } catch (err: unknown) {
      const execErr = err as { stdout?: string };
      stdout = execErr.stdout ?? "";
      reportId = stdout ? extractReportId(stdout) : null;
      console.log(`${TESTS_TAG} Fin (échec) — rapport: ${reportId ?? "N/A"}`);

      if (reportId) {
        return NextResponse.json({
          success: false,
          message:
            "Périmètre tests offensifs contrôlés terminé avec des échecs",
          reportId,
          reportLocation: "tests/results/controlled-offensive/",
          outputTail: stripAnsi(stdout).slice(-2500),
          error: err instanceof Error ? err.message : "Erreur inconnue",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Erreur inconnue",
          outputTail: stripAnsi(stdout).slice(-2500),
        },
        { status: 500 },
      );
    }

    console.log(
      `${TESTS_TAG} Fin — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })} — rapport: ${reportId ?? "N/A"}`,
    );
    return NextResponse.json({
      success: true,
      message: "Périmètre tests offensifs contrôlés généré (plan-only)",
      reportId,
      reportLocation: "tests/results/controlled-offensive/",
      reportKind: "controlled-offensive",
      outputTail: stripAnsi(stdout).slice(-2500),
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
