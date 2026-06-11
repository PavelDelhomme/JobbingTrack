import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { getProjectRoot } from "../testRunnerUtils";

const RUN_TIMEOUT_MS = 120000;
const TESTS_TAG = "[TESTS EMAIL TRIAGE]";

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/email-triage\/(\d{8}-\d{6})/);
  if (match) return `email-triage-${match[1]}`;

  const fallback = stdout.match(/\d{8}-\d{6}/);
  return fallback ? `email-triage-${fallback[0]}` : null;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

export async function POST(request: NextRequest) {
  console.log(
    `${TESTS_TAG} Démarrage suite agent email / triage — ${new Date().toLocaleString("fr-FR", { timeZone: process.env.TZ || "Europe/Paris" })}`,
  );

  try {
    await request.json().catch(() => ({}));
    const projectRoot = getProjectRoot();
    const command = `cd "${projectRoot}" && bash tests/email-triage/run-with-report.sh`;

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
      const execErr = err as { stdout?: string };
      stdout = execErr.stdout ?? "";
      reportId = stdout ? extractReportId(stdout) : null;
      console.log(
        `${TESTS_TAG} Fin (échec) — rapport: ${reportId ?? "N/A"}`,
      );

      if (reportId) {
        return NextResponse.json({
          success: false,
          message: "Suite agent email / triage terminée avec des échecs",
          reportId,
          reportLocation: "tests/results/email-triage/",
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
      message: "Suite agent email / triage terminée",
      reportId,
      reportLocation: "tests/results/email-triage/",
      reportKind: "email-triage",
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
