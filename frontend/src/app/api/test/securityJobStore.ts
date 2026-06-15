import { spawn } from "child_process";
import { randomUUID } from "crypto";

export type SecurityJobStatus = "running" | "success" | "failed";

export interface SecurityJob {
  id: string;
  kind: "security-app" | "cve-scan";
  label: string;
  status: SecurityJobStatus;
  startedAt: string;
  endedAt?: string;
  pid?: number;
  exitCode?: number | null;
  logs: string[];
  reportId?: string | null;
  error?: string;
  data?: Record<string, unknown>;
}

type GlobalWithSecurityJobs = typeof globalThis & {
  __jtSecurityJobs?: Map<string, SecurityJob>;
};

const globalForJobs = globalThis as GlobalWithSecurityJobs;
const jobs = globalForJobs.__jtSecurityJobs ?? new Map<string, SecurityJob>();
globalForJobs.__jtSecurityJobs = jobs;

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

export function createSecurityJob(
  kind: SecurityJob["kind"],
  label: string,
): SecurityJob {
  const job: SecurityJob = {
    id: randomUUID(),
    kind,
    label,
    status: "running",
    startedAt: new Date().toISOString(),
    logs: [],
  };
  jobs.set(job.id, job);
  return job;
}

export function getSecurityJob(jobId: string | null): SecurityJob | null {
  if (!jobId) return null;
  return jobs.get(jobId) ?? null;
}

export function appendSecurityJobLog(job: SecurityJob, chunk: string): void {
  const now = new Date().toLocaleTimeString("fr-FR");
  for (const rawLine of stripAnsi(chunk).split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    job.logs.push(`[${now}] ${line}`);
  }
  if (job.logs.length > 500) {
    job.logs.splice(0, job.logs.length - 500);
  }
}

export function runSecurityShellJob(options: {
  job: SecurityJob;
  command: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  onComplete: (
    job: SecurityJob,
    output: string,
    exitCode: number | null,
  ) => void;
}): void {
  const { job, command, cwd, env, timeoutMs, onComplete } = options;
  let output = "";
  appendSecurityJobLog(job, `▶ ${job.label}`);
  appendSecurityJobLog(job, `$ ${command}`);

  const child = spawn("bash", ["-lc", command], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  job.pid = child.pid;

  const timer = setTimeout(() => {
    appendSecurityJobLog(
      job,
      `⏱ Timeout après ${Math.round(timeoutMs / 1000)}s`,
    );
    child.kill("SIGTERM");
  }, timeoutMs);

  child.stdout.on("data", (data: Buffer) => {
    const text = data.toString("utf-8");
    output += text;
    appendSecurityJobLog(job, text);
  });

  child.stderr.on("data", (data: Buffer) => {
    const text = data.toString("utf-8");
    output += text;
    appendSecurityJobLog(job, text);
  });

  child.on("error", (error) => {
    clearTimeout(timer);
    job.status = "failed";
    job.error = error.message;
    job.endedAt = new Date().toISOString();
    appendSecurityJobLog(job, `❌ ${error.message}`);
  });

  child.on("close", (exitCode) => {
    clearTimeout(timer);
    job.exitCode = exitCode;
    job.endedAt = new Date().toISOString();
    onComplete(job, output, exitCode);
  });
}
