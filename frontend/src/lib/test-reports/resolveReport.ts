import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { isAbsolute, join, relative, resolve } from "path";

const IS_DOCKER = process.cwd() === "/app" || process.env.DOCKER === "true";
const PROJECT_ROOT =
  process.env.PROJECT_ROOT ||
  (process.cwd().includes("frontend")
    ? join(process.cwd(), "..")
    : process.cwd());

export const REPORT_DIRS = {
  "performance-backend": IS_DOCKER
    ? "/app/reports/performance/backend"
    : join(PROJECT_ROOT, "reports", "performance", "backend"),
  "performance-frontend": IS_DOCKER
    ? "/app/frontend/performance-reports"
    : join(PROJECT_ROOT, "frontend", "performance-reports"),
  playwright: IS_DOCKER
    ? "/app/frontend/playwright-report"
    : join(PROJECT_ROOT, "frontend", "playwright-report"),
  "tests-results":
    process.env.TESTS_RESULTS_DIR ||
    (IS_DOCKER
      ? "/app/tests/results"
      : join(PROJECT_ROOT, "tests", "results")),
  "user-journey":
    process.env.USER_JOURNEY_REPORTS_DIR ||
    (IS_DOCKER
      ? "/app/tests/user-journey-reports"
      : join(PROJECT_ROOT, "tests", "user-journey-reports")),
  analytics: IS_DOCKER
    ? "/app/tests/analytics-reports"
    : join(PROJECT_ROOT, "tests", "analytics-reports"),
  "security-reports": join(PROJECT_ROOT, "reports", "security"),
  "security-results": join(PROJECT_ROOT, "tests", "results", "security"),
} as const;

export function isWithinDirectory(baseDir: string, targetPath: string): boolean {
  const rel = relative(resolve(baseDir), resolve(targetPath));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function firstExistingReportFile(dir: string): Promise<string | null> {
  for (const fileName of ["summary.md", "summary.json", "report.html"]) {
    const filePath = join(dir, fileName);
    try {
      await stat(filePath);
      return filePath;
    } catch {
      // fichier suivant
    }
  }
  return null;
}

/** Répertoire du rapport (lecture seule) — aligné sur view/download/delete. */
export async function resolveReportDirectory(
  id: string,
): Promise<string | null> {
  if (id.startsWith("perf-backend-")) {
    const timestamp = id.replace("perf-backend-", "");
    const jsonFile = `backend_performance_${timestamp.replace("_", "_")}.json`;
    const filePath = join(REPORT_DIRS["performance-backend"], jsonFile);
    return existsSync(filePath) ? REPORT_DIRS["performance-backend"] : null;
  }

  if (id.startsWith("perf-frontend-")) {
    const timestamp = id.replace("perf-frontend-", "");
    const jsonFile = `performance_${timestamp.replace("_", "_")}.json`;
    const filePath = join(REPORT_DIRS["performance-frontend"], jsonFile);
    return existsSync(filePath) ? REPORT_DIRS["performance-frontend"] : null;
  }

  if (id.startsWith("playwright-")) {
    const indexPath = join(REPORT_DIRS.playwright, "index.html");
    return existsSync(indexPath) ? REPORT_DIRS.playwright : null;
  }

  if (id.startsWith("user-journey-")) {
    const suffix = id.replace("user-journey-", "");
    const filePath = join(
      REPORT_DIRS["user-journey"],
      `user-journey-${suffix}.json`,
    );
    return existsSync(filePath) ? REPORT_DIRS["user-journey"] : null;
  }

  if (id.startsWith("security-reports-")) {
    const suffix = id.replace("security-reports-", "");
    const reportDir = join(REPORT_DIRS["security-reports"], suffix);
    if (!isWithinDirectory(REPORT_DIRS["security-reports"], reportDir)) {
      return null;
    }
    return (await firstExistingReportFile(reportDir)) ? reportDir : null;
  }

  if (id.startsWith("security-results-")) {
    const suffix = id.replace("security-results-", "");
    const reportDir = join(REPORT_DIRS["security-results"], suffix);
    if (!isWithinDirectory(REPORT_DIRS["security-results"], reportDir)) {
      return null;
    }
    return (await firstExistingReportFile(reportDir)) ? reportDir : null;
  }

  const reportDir = join(REPORT_DIRS["tests-results"], id);
  if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
    return null;
  }
  return existsSync(reportDir) ? reportDir : null;
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    const previous = i > 0 ? trimmed[i - 1] : "";
    if (char === "|" && previous !== "\\") {
      cells.push(current.trim().replace(/\\\|/g, "|"));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/\\\|/g, "|"));
  return cells;
}

function parseNumberCell(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface SecurityCompareRow {
  kind: string;
  surface: string;
  status: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

function parseSecuritySummaryMd(content: string): {
  category: string;
  testName: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  rows: SecurityCompareRow[];
} {
  const lines = content.split(/\r?\n/);
  const meta: Record<string, string> = {};
  const rows: SecurityCompareRow[] = [];

  for (const line of lines) {
    const metaMatch = line.match(/^- ([a-zA-Z0-9_ -]+):\s*(.+)$/);
    if (metaMatch) {
      meta[metaMatch[1].trim()] = metaMatch[2].trim();
      continue;
    }
    if (!line.startsWith("|") || line.includes("---")) continue;
    if (line.includes("Kind") && line.includes("Surface")) continue;

    const cells = splitMarkdownTableRow(line);
    if (cells.length < 8) continue;

    rows.push({
      kind: cells[0],
      surface: cells[1].replace(/^`|`$/g, ""),
      status: cells[2],
      critical: parseNumberCell(cells[3]),
      high: parseNumberCell(cells[4]),
      medium: parseNumberCell(cells[5]),
      low: parseNumberCell(cells[6]),
      info: parseNumberCell(cells[7]),
    });
  }

  const totals = rows.reduce(
    (acc, row) => ({
      critical: acc.critical + row.critical,
      high: acc.high + row.high,
      medium: acc.medium + row.medium,
      low: acc.low + row.low,
      info: acc.info + row.info,
      skipped: acc.skipped + (row.status === "skipped" ? 1 : 0),
      surfaces: acc.surfaces + 1,
    }),
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      skipped: 0,
      surfaces: 0,
    },
  );

  const failed = rows.filter((row) => row.critical > 0 || row.high > 0).length;
  const passed = Math.max(0, totals.surfaces - failed - totals.skipped);

  return {
    category: "Sécurité",
    testName: meta.scan_type || meta.report_type || "Rapport sécurité CVE",
    summary: {
      total: totals.surfaces,
      passed,
      failed,
      skipped: totals.skipped,
      critical: totals.critical,
      high: totals.high,
      medium: totals.medium,
      low: totals.low,
      info: totals.info,
    },
    rows,
  };
}

export interface CompareTestRow {
  num: number;
  name: string;
  status: "pass" | "fail";
  expected: string;
  actual: string;
  response?: string;
  security?: SecurityCompareRow;
}

export interface CompareReportPayload {
  id: string;
  name: string;
  date: string;
  time: string;
  category: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    info?: number;
  };
  tests: CompareTestRow[];
}

function parseTestResultsTxt(content: string): CompareTestRow[] {
  const rows: CompareTestRow[] = [];
  for (const line of content.trim().split("\n")) {
    const parts = line.split("|");
    if (parts[0] !== "TEST" || parts.length < 5) continue;
    const [, num, name, status, expected, actual, response] = parts;
    rows.push({
      num: parseInt(num || "0", 10),
      name: (name || "").trim(),
      status:
        (status || "fail").trim().toLowerCase() === "pass" ? "pass" : "fail",
      expected: (expected || "").trim(),
      actual: (actual || "").trim(),
      response: (response || "").trim(),
    });
  }
  return rows;
}

function reportDateTimeFromId(id: string): { date: string; time: string } {
  const raw = id
    .replace(/^security-(reports|results)-/, "")
    .replace(/^perf-(backend|frontend)-/, "")
    .replace(/^user-journey-/, "");
  const match = raw.match(/(\d{8})[-_]?(\d{6})/);
  if (!match) {
    return { date: raw, time: "" };
  }
  const [, datePart, timePart] = match;
  return {
    date: `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`,
    time: `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`,
  };
}

export async function loadCompareReport(
  id: string,
): Promise<CompareReportPayload | null> {
  if (!(await resolveReportDirectory(id))) return null;

  let category = "Tests";
  let testName = "";
  let summary = { total: 0, passed: 0, failed: 0, skipped: 0 };
  let tests: CompareTestRow[] = [];

  let summaryJsonPath = "";
  let summaryMdPath = "";
  let testResultsPath = "";

  if (id.startsWith("perf-backend-")) {
    const timestamp = id.replace("perf-backend-", "");
    summaryJsonPath = join(
      REPORT_DIRS["performance-backend"],
      `backend_performance_${timestamp.replace("_", "_")}.json`,
    );
    category = "Performance Backend";
  } else if (id.startsWith("perf-frontend-")) {
    const timestamp = id.replace("perf-frontend-", "");
    summaryJsonPath = join(
      REPORT_DIRS["performance-frontend"],
      `performance_${timestamp.replace("_", "_")}.json`,
    );
    category = "Performance Frontend";
  } else if (id.startsWith("user-journey-")) {
    const suffix = id.replace("user-journey-", "");
    summaryJsonPath = join(
      REPORT_DIRS["user-journey"],
      `user-journey-${suffix}.json`,
    );
    category = "Parcours utilisateur";
  } else if (
    id.startsWith("security-reports-") ||
    id.startsWith("security-results-")
  ) {
    const dirPath = await resolveReportDirectory(id);
    if (!dirPath) return null;
    summaryJsonPath = join(dirPath, "summary.json");
    summaryMdPath = join(dirPath, "summary.md");
    testResultsPath = join(dirPath, "test-results.txt");
    category = "Sécurité";
  } else {
    const dirPath = join(REPORT_DIRS["tests-results"], id);
    summaryJsonPath = join(dirPath, "summary.json");
    summaryMdPath = join(dirPath, "summary.md");
    testResultsPath = join(dirPath, "test-results.txt");
  }

  if (summaryJsonPath && existsSync(summaryJsonPath)) {
    try {
      const raw = await readFile(summaryJsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      const s = parsed.summary || parsed;
      category = parsed.category || category;
      testName = parsed.testName || testName;
      summary = {
        total: s.totalTests ?? s.total ?? 0,
        passed: s.totalPassed ?? s.passed ?? 0,
        failed: s.totalFailed ?? s.failed ?? 0,
        skipped: s.totalSkipped ?? s.skipped ?? 0,
      };
    } catch {
      // ignore
    }
  }

  if (
    summaryMdPath &&
    existsSync(summaryMdPath) &&
    (id.startsWith("security-reports-") || id.startsWith("security-results-")) &&
    tests.length === 0
  ) {
    const md = await readFile(summaryMdPath, "utf-8");
    const parsed = parseSecuritySummaryMd(md);
    category = parsed.category;
    testName = parsed.testName;
    summary = parsed.summary;
    tests = parsed.rows.map((row, index) => ({
      num: index + 1,
      name: `${row.kind} — ${row.surface}`,
      status:
        row.critical > 0 || row.high > 0
          ? "fail"
          : row.status === "skipped"
            ? "fail"
            : "pass",
      expected: "0 critical/high",
      actual: `Critical ${row.critical} · High ${row.high} · Medium ${row.medium} · Low ${row.low} · Info ${row.info}`,
      response: row.status,
      security: row,
    }));
  }

  if (tests.length === 0 && existsSync(testResultsPath)) {
    try {
      const txt = await readFile(testResultsPath, "utf-8");
      tests = parseTestResultsTxt(txt);
    } catch {
      // ignore
    }
  }

  const { date, time } = reportDateTimeFromId(id);

  return {
    id,
    name: testName
      ? `${testName} - ${date} ${time}`.trim()
      : `Rapport ${date} ${time}`.trim(),
    date,
    time,
    category,
    summary,
    tests,
  };
}
