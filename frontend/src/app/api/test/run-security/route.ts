import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  getProjectRoot,
  isRunningInFrontendContainer,
} from "../testRunnerUtils";
import { getTestsResultsDir } from "@/lib/test-reports/paths";
import {
  appendSecurityJobLog,
  createSecurityJob,
  getSecurityJob,
  runSecurityShellJob,
} from "../securityJobStore";

const RUN_TIMEOUT_MS = 120000;

const TESTS_TAG = "[TESTS SECURITY]";

function extractReportId(stdout: string): string | null {
  const match = stdout.match(/\d{8}-\d{6}/);
  return match ? match[0] : null;
}

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

function readSecurityCounts(reportId: string | null): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  if (!reportId) return { critical: 0, high: 0, medium: 0, low: 0 };
  const reportPath = join(getTestsResultsDir(), reportId, "security-report.json");
  if (!existsSync(reportPath)) return { critical: 0, high: 0, medium: 0, low: 0 };
  try {
    const parsed = JSON.parse(readFileSync(reportPath, "utf-8"));
    return {
      critical: Number(parsed.critical ?? 0),
      high: Number(parsed.high ?? 0),
      medium: Number(parsed.medium ?? 0),
      low: Number(parsed.low ?? 0),
    };
  } catch {
    return { critical: 0, high: 0, medium: 0, low: 0 };
  }
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
    const command = `cd "${projectRoot}" && bash "${scriptPath}" security "${testCommand}" "${testName}"`;

    const job = createSecurityJob("security-app", "Tests sécurité applicatifs");
    appendSecurityJobLog(job, `Rapports écrits dans: ${getTestsResultsDir()}`);
    runSecurityShellJob({
      job,
      command,
      cwd: projectRoot,
      timeoutMs: RUN_TIMEOUT_MS,
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
      onComplete: (completedJob, output, exitCode) => {
        const reportId = extractReportId(output);
        completedJob.reportId = reportId;
        if (!reportId) {
          completedJob.status = "failed";
          completedJob.error = "Tests terminés sans identifiant de rapport";
          appendSecurityJobLog(completedJob, `❌ ${completedJob.error}`);
          return;
        }
        const counts = readSecurityCounts(reportId);
        const hasCriticalHigh = counts.critical > 0 || counts.high > 0;
        const hasMediumLow = counts.medium > 0 || counts.low > 0;
        completedJob.status = !hasCriticalHigh && exitCode === 0 ? "success" : "failed";
        completedJob.data = {
          warning: hasMediumLow && !hasCriticalHigh,
          counts,
          reportLocation: "tests/results/",
          reportKind: "security-app-tests",
          hint: "Pour le scan CVE dépendances (npm/Rust/Docker), utilisez « Scan CVE ».",
        };
        appendSecurityJobLog(
          completedJob,
          hasCriticalHigh
            ? `❌ Tests terminés — critical/high détectés — rapport ${reportId}`
            : hasMediumLow
              ? `⚠️ Tests terminés — avertissements medium/low — rapport ${reportId}`
              : `✅ Tests sécurité applicatifs terminés — rapport ${reportId}`,
        );
      },
    });

    console.log(
      `${TESTS_TAG} Job lancé — ${job.id}`,
    );
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        message: "Tests sécurité lancés — progression disponible",
        logs: job.logs,
      },
      { status: 202 },
    );
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

export async function GET(request: NextRequest) {
  const job = getSecurityJob(request.nextUrl.searchParams.get("jobId"));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job tests sécurité introuvable" },
      { status: 404 },
    );
  }

  const done = job.status !== "running";
  return NextResponse.json({
    success: job.status !== "failed",
    jobId: job.id,
    status: job.status,
    done,
    reportId: job.reportId,
    exitCode: job.exitCode,
    error: job.error,
    logs: job.logs.map(stripAnsi),
    ...job.data,
  });
}
