import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import {
  getProjectRoot,
  isRunningInFrontendContainer,
} from "../testRunnerUtils";
import { join } from "path";

export const maxDuration = 120; // 2 min pour les tests E2E

const RUN_TIMEOUT_MS = 120_000; // 2 min

/**
 * Lance les tests E2E : mobile-emulator + email-verification-monitor
 * (parcours complets, inscription, vérification email dans Email Monitor).
 * Appelé depuis la page backoffice/mobile-emulator.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const baseURL =
      body?.baseURL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:5003";
    const apiURL =
      body?.apiURL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_GATEWAY_URL ||
      "http://localhost:5002";

    const projectRoot = getProjectRoot();
    const inContainer = isRunningInFrontendContainer();
    const frontendDir = inContainer ? "/app" : join(projectRoot, "frontend");

    // En Docker, écrire rapports dans /tmp pour éviter EACCES sur /app
    const reportDir = inContainer ? "/tmp/playwright-e2e" : undefined;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
      API_URL: apiURL,
    };
    if (reportDir) {
      env.REPORT_DIR = reportDir;
      env.TESTS_RESULTS_DIR = reportDir;
    }

    const specFiles =
      "tests/e2e/mobile-emulator.spec.ts tests/e2e/email-verification-monitor.spec.ts";
    const cmd = `npx playwright test ${specFiles} --project=chromium`;

    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(cmd, {
        encoding: "utf-8",
        cwd: frontendDir,
        env,
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
      });
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      stdout =
        [e.stdout, e.stderr].filter(Boolean).join("\n") ||
        (err as Error).message;
    }

    const success = exitCode === 0;
    return NextResponse.json({
      success,
      exitCode,
      output: stdout,
      message: success
        ? "Tous les tests sont passés."
        : "Certains tests ont échoué.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        output: "",
      },
      { status: 500 },
    );
  }
}
