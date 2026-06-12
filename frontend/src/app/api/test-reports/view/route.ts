import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { isAbsolute, join, relative, resolve } from "path";
import { existsSync } from "fs";

// Chemin vers la racine du projet
const PROJECT_ROOT = process.cwd().includes("frontend")
  ? join(process.cwd(), "..")
  : process.cwd();

// ✅ Détecter si on est dans Docker ou sur l'hôte
const IS_DOCKER = process.cwd() === "/app" || process.env.DOCKER === "true";
const PROJECT_ROOT_VIEW = IS_DOCKER
  ? "/app"
  : process.cwd().includes("frontend")
    ? join(process.cwd(), "..")
    : process.cwd();

// Dossiers de rapports
const REPORT_DIRS = {
  "performance-backend": IS_DOCKER
    ? "/app/reports/performance/backend"
    : join(PROJECT_ROOT_VIEW, "reports/performance/backend"),
  "performance-frontend": IS_DOCKER
    ? "/app/frontend/performance-reports"
    : join(PROJECT_ROOT_VIEW, "frontend", "performance-reports"),
  playwright: IS_DOCKER
    ? "/app/frontend/playwright-report"
    : join(PROJECT_ROOT_VIEW, "frontend", "playwright-report"),
  "tests-results":
    process.env.TESTS_RESULTS_DIR ||
    (IS_DOCKER
      ? "/tmp/tests/results"
      : join(PROJECT_ROOT_VIEW, "tests", "results")),
  "user-journey":
    process.env.USER_JOURNEY_REPORTS_DIR ||
    (IS_DOCKER
      ? "/tmp/journey-reports"
      : join(PROJECT_ROOT_VIEW, "tests", "user-journey-reports")),
  "user-journey-legacy": IS_DOCKER ? "/app/tests/user-journey-reports" : "",
  analytics: IS_DOCKER
    ? "/app/tests/analytics-reports"
    : join(PROJECT_ROOT_VIEW, "tests", "analytics-reports"),
  "security-reports": join(PROJECT_ROOT_VIEW, "reports", "security"),
  "security-results": join(
    process.env.TESTS_RESULTS_DIR ||
      (IS_DOCKER
        ? "/tmp/tests/results"
        : join(PROJECT_ROOT_VIEW, "tests", "results")),
    "security",
  ),
};

async function firstExistingReportFile(dir: string): Promise<string | null> {
  for (const fileName of ["summary.md", "summary.json", "report.html"]) {
    const filePath = join(dir, fileName);
    try {
      await stat(filePath);
      return filePath;
    } catch {
      // Essayer le fichier suivant
    }
  }

  return null;
}

async function firstExistingStandardReportFile(
  dir: string,
): Promise<string | null> {
  for (const fileName of [
    "report.html",
    "summary.json",
    "security.json",
    "security-report.json",
  ]) {
    const filePath = join(dir, fileName);
    try {
      await stat(filePath);
      return filePath;
    } catch {
      // Essayer le fichier suivant
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function formatSecurityNotes(notes: string): string {
  const parts = notes
    .split(/<br\s*\/?>/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '<span class="muted">Aucune note.</span>';

  return `<ul class="findings">${parts
    .map((part) => `<li>${escapeHtml(part)}</li>`)
    .join("")}</ul>`;
}

function generateSecurityMarkdownHTML(content: string, reportId: string): string {
  const lines = content.split(/\r?\n/);
  const meta: Record<string, string> = {};
  const rows: Array<{
    kind: string;
    surface: string;
    status: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    notes: string;
  }> = [];

  for (const line of lines) {
    const metaMatch = line.match(/^- ([a-zA-Z0-9_ -]+):\s*(.+)$/);
    if (metaMatch) {
      meta[metaMatch[1].trim()] = metaMatch[2].trim();
      continue;
    }

    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;
    if (line.includes("Kind") && line.includes("Surface")) continue;

    const cells = splitMarkdownTableRow(line);
    if (cells.length < 9) continue;

    rows.push({
      kind: cells[0],
      surface: cells[1].replace(/^`|`$/g, ""),
      status: cells[2],
      critical: parseNumberCell(cells[3]),
      high: parseNumberCell(cells[4]),
      medium: parseNumberCell(cells[5]),
      low: parseNumberCell(cells[6]),
      info: parseNumberCell(cells[7]),
      notes: cells.slice(8).join(" | "),
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

  const runtimeRows = rows.filter((row) => row.status !== "skipped");
  const priorityRows = runtimeRows
    .filter((row) => row.critical > 0 || row.high > 0)
    .sort((a, b) => b.critical - a.critical || b.high - a.high)
    .slice(0, 8);

  const generatedAt = meta.generated_at
    ? new Date(meta.generated_at).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Non renseigné";

  const priorityList =
    priorityRows.length > 0
      ? priorityRows
          .map(
            (row) => `
            <article class="priority-card">
              <div>
                <span class="surface">${escapeHtml(row.surface)}</span>
                <span class="kind">${escapeHtml(row.kind)}</span>
              </div>
              <div class="priority-counts">
                <span class="pill critical">${row.critical} critical</span>
                <span class="pill high">${row.high} high</span>
              </div>
            </article>`,
          )
          .join("")
      : '<p class="muted">Aucune surface avec criticite haute ou critique.</p>';

  const tableRows = rows
    .map((row) => {
      const severityClass =
        row.critical > 0
          ? "critical"
          : row.high > 0
            ? "high"
            : row.medium > 0
              ? "medium"
              : "ok";
      const displayStatus =
        row.critical > 0 || row.high > 0
          ? "à traiter"
          : row.status === "skipped"
            ? "skipped"
            : row.medium > 0 || row.low > 0
              ? "à surveiller"
              : "ok";
      const statusClass =
        row.critical > 0
          ? "critical"
          : row.high > 0
            ? "high"
            : row.medium > 0 || row.low > 0
              ? "medium"
              : row.status;
      return `
        <tr class="${severityClass}">
          <td>
            <div class="surface">${escapeHtml(row.surface)}</div>
            <div class="kind">${escapeHtml(row.kind)}</div>
          </td>
          <td><span class="status ${escapeHtml(statusClass)}">${escapeHtml(displayStatus)}</span></td>
          <td class="num critical-text">${row.critical}</td>
          <td class="num high-text">${row.high}</td>
          <td class="num medium-text">${row.medium}</td>
          <td class="num">${row.low}</td>
          <td class="num">${row.info}</td>
          <td>${formatSecurityNotes(row.notes)}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport securite CVE - ${escapeHtml(reportId)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --panel: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --critical: #b91c1c;
      --critical-bg: #fef2f2;
      --high: #c2410c;
      --high-bg: #fff7ed;
      --medium: #a16207;
      --medium-bg: #fefce8;
      --ok: #15803d;
      --ok-bg: #f0fdf4;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background: radial-gradient(circle at top left, #e0f2fe, transparent 30%), var(--bg);
      line-height: 1.5;
    }
    .shell { max-width: 1280px; margin: 0 auto; }
    .hero {
      background: linear-gradient(135deg, #0f172a, #1e3a8a);
      color: #fff;
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.18);
      margin-bottom: 20px;
    }
    .hero h1 { margin: 0 0 8px; font-size: clamp(26px, 4vw, 42px); letter-spacing: -0.04em; }
    .hero p { margin: 0; color: #dbeafe; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    .meta span, .pill, .status {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .meta span { background: rgba(255, 255, 255, 0.14); color: #eff6ff; }
    .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card, .panel {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
    }
    .card { padding: 16px; }
    .card .label { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .card .value { font-size: 30px; font-weight: 900; margin-top: 4px; letter-spacing: -0.04em; }
    .card.critical { background: var(--critical-bg); border-color: #fecaca; color: var(--critical); }
    .card.high { background: var(--high-bg); border-color: #fed7aa; color: var(--high); }
    .card.medium { background: var(--medium-bg); border-color: #fde68a; color: var(--medium); }
    .card.ok { background: var(--ok-bg); border-color: #bbf7d0; color: var(--ok); }
    .panel { padding: 18px; margin-bottom: 20px; }
    .panel h2 { margin: 0 0 12px; font-size: 18px; }
    .priority-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .priority-card {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: #fff;
    }
    .surface { font-weight: 800; }
    .kind { color: var(--muted); font-size: 12px; margin-top: 2px; }
    .priority-counts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .pill.critical, .status.failed, .status.critical { background: var(--critical-bg); color: var(--critical); }
    .pill.high, .status.high { background: var(--high-bg); color: var(--high); }
    .status.medium { background: var(--medium-bg); color: var(--medium); }
    .status.ok { background: var(--ok-bg); color: var(--ok); }
    .status.skipped { background: #f1f5f9; color: #475569; }
    .table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid var(--line); background: #fff; }
    table { width: 100%; border-collapse: collapse; min-width: 1040px; }
    th {
      position: sticky;
      top: 0;
      background: #f8fafc;
      color: #334155;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid var(--line);
    }
    td { vertical-align: top; padding: 12px; border-bottom: 1px solid #f1f5f9; }
    tr.critical { background: rgba(254, 242, 242, 0.55); }
    tr.high { background: rgba(255, 247, 237, 0.55); }
    tr.medium { background: rgba(254, 252, 232, 0.55); }
    .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; }
    .critical-text { color: var(--critical); }
    .high-text { color: var(--high); }
    .medium-text { color: var(--medium); }
    .findings { margin: 0; padding-left: 18px; max-width: 560px; }
    .findings li { margin-bottom: 6px; }
    .muted { color: var(--muted); }
    .raw {
      margin-top: 16px;
      white-space: pre-wrap;
      background: #0f172a;
      color: #dbeafe;
      border-radius: 14px;
      padding: 16px;
      overflow: auto;
      max-height: 420px;
    }
    @media (max-width: 900px) {
      body { padding: 14px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .priority-list { grid-template-columns: 1fr; }
      .priority-card { flex-direction: column; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .hero, .card, .panel { box-shadow: none; }
      th { position: static; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <h1>Rapport securite CVE</h1>
      <p>Vue synthetique des dependances et surfaces scannees.</p>
      <div class="meta">
        <span>ID: ${escapeHtml(reportId)}</span>
        <span>Genere: ${escapeHtml(generatedAt)}</span>
        <span>Docker: ${escapeHtml(meta.docker_scan || "false")}</span>
        <span>Strict: ${escapeHtml(meta.strict || "false")}</span>
        <span>Seuil: ${escapeHtml(meta.fail_on || "high")}</span>
      </div>
    </section>

    <section class="grid" aria-label="Synthese">
      <article class="card"><div class="label">Surfaces</div><div class="value">${totals.surfaces}</div></article>
      <article class="card critical"><div class="label">Critical</div><div class="value">${totals.critical}</div></article>
      <article class="card high"><div class="label">High</div><div class="value">${totals.high}</div></article>
      <article class="card medium"><div class="label">Medium</div><div class="value">${totals.medium}</div></article>
      <article class="card"><div class="label">Low / Info</div><div class="value">${totals.low + totals.info}</div></article>
      <article class="card ok"><div class="label">Scans actifs</div><div class="value">${Math.max(0, totals.surfaces - totals.skipped)}</div></article>
    </section>

    <section class="panel">
      <h2>Priorites a trier</h2>
      <div class="priority-list">${priorityList}</div>
    </section>

    <section class="panel">
      <h2>Details par surface</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Surface</th>
              <th>Statut</th>
              <th>Critical</th>
              <th>High</th>
              <th>Medium</th>
              <th>Low</th>
              <th>Info</th>
              <th>Notes / advisories</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <details>
        <summary class="muted">Voir le Markdown brut</summary>
        <pre class="raw">${escapeHtml(content)}</pre>
      </details>
    </section>
  </main>
</body>
</html>`;
}

function isWithinDirectory(baseDir: string, targetPath: string): boolean {
  const relativePath = relative(resolve(baseDir), resolve(targetPath));
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const filePath = searchParams.get("path");
    const category = searchParams.get("category"); // Nouveau: catégorie du rapport
    const playwrightReport = searchParams.get("playwright") === "1"; // Rapport HTML Playwright (captures d'écran)

    if (!id && !filePath) {
      return NextResponse.json(
        { success: false, error: "Paramètre id ou path manquant" },
        { status: 400 },
      );
    }

    // ✅ NOUVEAU: Déterminer le chemin selon le type de rapport
    let fullPath: string;

    if (id) {
      // Identifier le type de rapport depuis l'ID
      if (id.startsWith("perf-backend-")) {
        // Rapport performance backend
        const timestamp = id.replace("perf-backend-", "");
        const jsonFile = `backend_performance_${timestamp.replace("_", "_")}.json`;
        fullPath = join(REPORT_DIRS["performance-backend"], jsonFile);
      } else if (id.startsWith("perf-frontend-")) {
        // Rapport performance frontend
        const timestamp = id.replace("perf-frontend-", "");
        const jsonFile = `performance_${timestamp.replace("_", "_")}.json`;
        fullPath = join(REPORT_DIRS["performance-frontend"], jsonFile);
      } else if (id.startsWith("playwright-")) {
        // Rapport Playwright
        fullPath = join(REPORT_DIRS["playwright"], "index.html");
      } else if (id.startsWith("user-journey-")) {
        // Rapport parcours utilisateur (JSON)
        const suffix = id.replace("user-journey-", "");
        fullPath = join(
          REPORT_DIRS["user-journey"],
          `user-journey-${suffix}.json`,
        );
      } else if (id.startsWith("security-reports-")) {
        const suffix = id.replace("security-reports-", "");
        const reportDir = join(REPORT_DIRS["security-reports"], suffix);
        if (!isWithinDirectory(REPORT_DIRS["security-reports"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }

        const reportPath = await firstExistingReportFile(reportDir);
        if (!reportPath) {
          return NextResponse.json(
            { success: false, error: "Rapport sécurité non trouvé" },
            { status: 404 },
          );
        }
        fullPath = reportPath;
      } else if (id.startsWith("security-results-")) {
        const suffix = id.replace("security-results-", "");
        const reportDir = join(REPORT_DIRS["security-results"], suffix);
        if (!isWithinDirectory(REPORT_DIRS["security-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }

        const reportPath = await firstExistingReportFile(reportDir);
        if (!reportPath) {
          return NextResponse.json(
            { success: false, error: "Rapport sécurité non trouvé" },
            { status: 404 },
          );
        }
        fullPath = reportPath;
      } else if (id.startsWith("email-triage-")) {
        const suffix = id.replace("email-triage-", "");
        const reportDir = join(
          REPORT_DIRS["tests-results"],
          "email-triage",
          suffix,
        );
        if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = join(reportDir, "summary.json");
      } else if (id.startsWith("controlled-offensive-")) {
        const suffix = id.replace("controlled-offensive-", "");
        const reportDir = join(
          REPORT_DIRS["tests-results"],
          "controlled-offensive",
          suffix,
        );
        if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = join(reportDir, "summary.json");
      } else if (id.startsWith("performance-correlation-")) {
        const suffix = id.replace("performance-correlation-", "");
        const reportDir = join(
          REPORT_DIRS["tests-results"],
          "performance-correlation",
          suffix,
        );
        if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = join(reportDir, "summary.json");
      } else if (id.startsWith("statistics-log-stats-")) {
        const suffix = id.replace("statistics-log-stats-", "");
        const reportDir = join(
          REPORT_DIRS["tests-results"],
          "statistics-log-stats",
          suffix,
        );
        if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = join(reportDir, "summary.json");
      } else if (id.startsWith("statistics-app-data-")) {
        const suffix = id.replace("statistics-app-data-", "");
        const reportDir = join(
          REPORT_DIRS["tests-results"],
          "statistics-app-data",
          suffix,
        );
        if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = join(reportDir, "summary.json");
      } else {
        // Format standard: YYYYMMDD-HHMMSS (tests results)
        if (playwrightReport) {
          // Rapport Playwright détaillé (avec captures d'écran) pour ce run
          const playwrightPath = join(
            REPORT_DIRS["tests-results"],
            id,
            "playwright-report",
            "index.html",
          );
          if (existsSync(playwrightPath)) {
            fullPath = playwrightPath;
          } else {
            fullPath = join(REPORT_DIRS["tests-results"], id, "report.html");
          }
        } else {
          const reportDir = join(REPORT_DIRS["tests-results"], id);
          if (!isWithinDirectory(REPORT_DIRS["tests-results"], reportDir)) {
            return NextResponse.json(
              { success: false, error: "Chemin non autorisé" },
              { status: 403 },
            );
          }
          const reportPath = await firstExistingStandardReportFile(reportDir);
          fullPath = reportPath ?? join(reportDir, "report.html");
        }
      }
    } else if (filePath) {
      // Support legacy
      if (filePath.startsWith("/") || filePath.includes("..")) {
        const resolved = resolve(
          REPORT_DIRS["tests-results"],
          filePath.replace(REPORT_DIRS["tests-results"], ""),
        );
        if (!resolved.startsWith(resolve(REPORT_DIRS["tests-results"]))) {
          return NextResponse.json(
            { success: false, error: "Chemin non autorisé" },
            { status: 403 },
          );
        }
        fullPath = resolved;
      } else {
        fullPath = join(REPORT_DIRS["tests-results"], filePath);
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Paramètre manquant" },
        { status: 400 },
      );
    }

    // Vérifier que le chemin résolu est bien dans un répertoire autorisé
    const authorizedDirs = Object.values(REPORT_DIRS).map((d) => resolve(d));
    const resolvedFile = resolve(fullPath);
    const isAuthorized = authorizedDirs.some((dir) =>
      resolvedFile.startsWith(dir),
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Chemin non autorisé" },
        { status: 403 },
      );
    }

    // Vérifier que le fichier existe
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Fichier non trouvé" },
        { status: 404 },
      );
    }

    // Lire le contenu
    let content = await readFile(fullPath, "utf-8");

    // Sanitizer le HTML pour l’iframe : éviter "Uncaught SyntaxError: string literal contains an unescaped line break"
    // en échappant les retours à la ligne uniquement dans les chaînes (guillemets) des scripts
    content = content.replace(
      /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
      (match, body) => {
        const escapedBody = body.replace(
          /("(?:[^"\\]|\\.|[\r\n])*"|'(?:[^'\\]|\\.|[\r\n])*')/g,
          (strLiteral: string) =>
            strLiteral.replace(/\r\n?|\n/g, "\\n").replace(/\r/g, ""),
        );
        return (
          match.slice(0, match.indexOf(">") + 1) + escapedBody + "</script>"
        );
      },
    );

    const isSecurityReport =
      id?.startsWith("security-reports-") || id?.startsWith("security-results-");

    // Si c'est un JSON (rapport performance), générer un HTML
    if (fullPath.endsWith(".json")) {
      try {
        const jsonData = JSON.parse(content);
        content = generateHTMLFromJSON(jsonData, id || "report");
      } catch {
        // Si erreur de parsing, retourner le JSON brut
        content = `<pre>${escapeHtml(content)}</pre>`;
      }
    } else if (fullPath.endsWith(".md")) {
      content = isSecurityReport
        ? generateSecurityMarkdownHTML(content, id || "security-report")
        : `<pre>${escapeHtml(content)}</pre>`;
    }

    // Ajouter viewport meta tag si absent
    if (
      !content.includes("viewport") &&
      !content.includes('meta name="viewport"')
    ) {
      const viewportMeta =
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">';

      if (content.includes("<head>")) {
        content = content.replace("<head>", `<head>${viewportMeta}`);
      } else if (content.includes("<html")) {
        const htmlMatch = content.match(/<html[^>]*>/);
        if (htmlMatch) {
          content = content.replace(
            htmlMatch[0],
            `${htmlMatch[0]}\n<head>${viewportMeta}</head>`,
          );
        }
      } else {
        content = `<!DOCTYPE html><html><head>${viewportMeta}</head><body>${content}</body></html>`;
      }
    }

    // Ajouter des styles pour améliorer l'affichage
    const mobileStyles = `
    <style>
      @media (max-width: 768px) {
        body { 
          font-size: 14px; 
          padding: 10px; 
          margin: 0;
          overflow-x: auto;
        }
        .container { 
          max-width: 100%;
          padding: 10px;
        }
        table {
          font-size: 12px;
          display: block;
          overflow-x: auto;
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }
      .dark body {
        background: #1a1a1a;
        color: #e5e5e5;
      }
      pre {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
      .dark pre {
        background: #2a2a2a;
      }
    </style>
    `;

    if (content.includes("</head>")) {
      content = content.replace("</head>", `${mobileStyles}</head>`);
    } else if (content.includes("<head>")) {
      content = content.replace("<head>", `<head>${mobileStyles}`);
    }

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error: any) {
    console.error("Erreur lecture rapport:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erreur lors de la lecture du rapport",
      },
      { status: 500 },
    );
  }
}

/**
 * Génère un HTML à partir d'un JSON de rapport
 */
function generateHTMLFromJSON(data: any, reportId: string): string {
  const isPerformance = reportId.includes("perf-");
  const isBackend = reportId.includes("backend");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport ${isPerformance ? "Performance" : "Test"} - ${reportId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      color: #333;
    }
    .content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    pre {
      background: #f8f8f8;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border: 1px solid #e0e0e0;
    }
    .metric {
      display: inline-block;
      margin: 10px;
      padding: 10px 20px;
      background: #e3f2fd;
      border-radius: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1976d2;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Rapport ${isPerformance ? "Performance" : "Test"}</h1>
    <p><strong>ID:</strong> ${reportId}</p>
    <p><strong>Date:</strong> ${data.date || data.timestamp || "N/A"}</p>
  </div>
  <div class="content">
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
</body>
</html>`;

  return html;
}
