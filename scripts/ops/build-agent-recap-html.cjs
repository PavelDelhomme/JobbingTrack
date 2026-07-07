#!/usr/bin/env node

/**
 * Gabarit HTML récap agent — format standard détaillé (problème → solution → commits → tests).
 * Schéma JSON : scripts/ops/templates/agent-recap.example.json
 * @used-by scripts/ops/send-agent-recap-email.cjs, scripts/ops/collect-session-recap-git.cjs
 */

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE_PATH = path.join(__dirname, "templates/agent-recap-email.html");

const STATUS_STYLES = {
  ok: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#15803d", label: "OK" },
  ko: { bg: "#fef2f2", border: "#fecaca", accent: "#b91c1c", label: "KO" },
  pending: { bg: "#fffbeb", border: "#fde68a", accent: "#a16207", label: "En attente" },
  info: { bg: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8", label: "Info" },
  resolved: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#15803d", label: "Résolu" },
  open: { bg: "#fef2f2", border: "#fecaca", accent: "#b91c1c", label: "Ouvert" },
};

const KPI_TONES = {
  ok: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
  info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  warn: { bg: "#fefce8", border: "#fde68a", color: "#a16207" },
  ko: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  neutral: { bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineCode(text) {
  return `<code style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:12px;word-break:break-all;">${escapeHtml(text)}</code>`;
}

function statusBadge(status) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.info;
  return `<span style="display:inline-block;background:${style.bg};color:${style.accent};border:1px solid ${style.border};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;">${escapeHtml(style.label)}</span>`;
}

function formatDate(input) {
  const date = input instanceof Date ? input : new Date(input || Date.now());
  if (Number.isNaN(date.getTime())) return escapeHtml(String(input || ""));
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
    timeStyle: "short",
  });
}

function renderParagraphs(text) {
  if (!text) return "";
  return String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 12px;font-size:15px;">${escapeHtml(block).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function renderList(items, { ordered = false } = {}) {
  if (!items?.length) return "";
  const tag = ordered ? "ol" : "ul";
  const lis = items
    .map((item) => {
      if (typeof item === "string") {
        return `<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`;
      }
      const text = item.text || item.label || "";
      const note = item.note ? ` <span style="color:#64748b;">— ${escapeHtml(item.note)}</span>` : "";
      const result = item.result ? ` ${formatResultBadge(item.result)}` : "";
      return `<li style="margin-bottom:6px;">${escapeHtml(text)}${result}${note}</li>`;
    })
    .join("");
  return `<${tag} style="margin:0;padding-left:20px;font-size:14px;">${lis}</${tag}>`;
}

function formatResultBadge(result) {
  const raw = String(result || "").trim();
  if (/^(OK|PASS|✅)$/i.test(raw)) {
    return `<span style="color:#15803d;font-weight:600;">OK</span>`;
  }
  if (/^(KO|FAIL|❌)$/i.test(raw)) {
    return `<span style="color:#b91c1c;font-weight:600;">KO</span>`;
  }
  if (/^(SKIP|—|-)$/i.test(raw)) {
    return `<span style="color:#64748b;">SKIP</span>`;
  }
  return `<span style="color:#475569;">${escapeHtml(raw)}</span>`;
}

function renderKeyValueTable(rows) {
  if (!rows?.length) return "";
  const body = rows
    .filter((row) => row?.value || row?.values?.length)
    .map((row) => {
      let valueHtml = "";
      if (Array.isArray(row.values)) {
        valueHtml = row.values.map((v) => inlineCode(v)).join(" ");
      } else if (row.code) {
        valueHtml = inlineCode(row.value);
      } else {
        valueHtml = escapeHtml(row.value);
      }
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-weight:600;width:120px;color:#475569;font-size:13px;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:14px;">${valueHtml}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${body}</table>`;
}

function buildHeaderBlock(data) {
  const eyebrow = escapeHtml(data.eyebrow || "JobbingTrack · Récap agent");
  const title = escapeHtml(data.title || "Récapitulatif session");
  const branch = data.branch ? inlineCode(data.branch) : "";
  const branches =
    data.branches?.length > 0
      ? `<p style="margin:8px 0 0;font-size:13px;opacity:0.85;">Branches mergées : ${data.branches.map((b) => inlineCode(b)).join(" ")}</p>`
      : "";
  const metaLines = (data.meta || [])
    .map(
      (row) =>
        `<p style="margin:8px 0 0;font-size:13px;opacity:0.85;">${escapeHtml(row.label)} : ${row.code ? inlineCode(row.value) : escapeHtml(row.value)}</p>`,
    )
    .join("");

  return `<tr>
    <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 45%,#3b82f6 100%);padding:32px 36px;color:#ffffff;">
      <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:8px;">${eyebrow}</div>
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;line-height:1.25;">${title}</h1>
      ${data.date ? `<p style="margin:0;font-size:14px;opacity:0.92;">${formatDate(data.date)}</p>` : ""}
      ${branch ? `<p style="margin:12px 0 0;font-size:15px;opacity:0.92;">Branche session ${branch}</p>` : ""}
      ${branches}
      ${metaLines}
    </td>
  </tr>`;
}

function buildKpiBlock(kpis) {
  if (!kpis?.length) return "";
  const cells = kpis
    .map((kpi) => {
      const tone = KPI_TONES[kpi.tone || "neutral"] || KPI_TONES.neutral;
      return `<td width="${Math.floor(100 / kpis.length)}%" style="padding:4px;">
        <div style="background:${tone.bg};border:1px solid ${tone.border};border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:${tone.color};">${escapeHtml(kpi.value)}</div>
          <div style="font-size:12px;color:${tone.color};margin-top:4px;">${escapeHtml(kpi.label)}</div>
        </div>
      </td>`;
    })
    .join("");

  return `<tr>
    <td style="padding:28px 36px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td>
  </tr>`;
}

function buildSummaryBlock(summary) {
  if (!summary) return "";
  return `<tr>
    <td style="padding:20px 36px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Synthèse exécutive</h2>
      ${renderParagraphs(summary)}
    </td>
  </tr>`;
}

function buildWorkItemsBlock(workItems) {
  if (!workItems?.length) return "";
  const blocks = workItems
    .map((item) => {
      const style = STATUS_STYLES[item.status || "info"] || STATUS_STYLES.info;
      const idLabel = item.id ? `${escapeHtml(item.id)} — ` : "";
      const rows = [
        item.problem ? { label: "Problème", value: item.problem } : null,
        item.cause ? { label: "Cause", value: item.cause } : null,
        item.solution ? { label: "Solution", value: item.solution } : null,
        item.files?.length ? { label: "Fichiers", values: item.files } : null,
        item.commits?.length ? { label: "Commits", values: item.commits } : null,
      ].filter(Boolean);

      const testsHtml =
        item.tests?.length > 0
          ? `<div style="margin-top:12px;"><strong style="font-size:13px;color:#475569;">Validations</strong>${renderList(item.tests)}</div>`
          : "";

      const highlights =
        item.highlights?.length > 0
          ? `<div style="margin-top:12px;">${renderList(item.highlights)}</div>`
          : "";

      return `<div style="background:${style.bg};border:1px solid ${style.border};border-left:4px solid ${style.accent};border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <h2 style="margin:0;font-size:17px;color:${style.accent};flex:1;">${idLabel}${escapeHtml(item.title || "Livrable")}</h2>
          ${statusBadge(item.status || "info")}
        </div>
        ${item.body ? renderParagraphs(item.body) : ""}
        ${renderKeyValueTable(rows)}
        ${highlights}
        ${testsHtml}
      </div>`;
    })
    .join("");

  return `<tr><td style="padding:8px 36px 4px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Travaux réalisés (détail)</h2>
    ${blocks}
  </td></tr>`;
}

function buildIssuesBlock(issues) {
  if (!issues?.length) return "";
  const headers = ["Problème", "Cause", "Solution", "Statut", "Commits"];
  const rows = issues.map((issue) => [
    issue.problem || "—",
    issue.cause || "—",
    issue.solution || "—",
    issue.status || "open",
    (issue.relatedCommits || []).join(", ") || "—",
  ]);

  return `<tr><td style="padding:8px 36px 20px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Incidents &amp; résolutions</h2>
    ${buildGenericTable({ headers, rows, statusColumn: 3 })}
  </td></tr>`;
}

function buildGenericTable(table, { statusColumn = -1 } = {}) {
  const headers = (table.headers || [])
    .map(
      (h) =>
        `<th style="padding:10px 14px;text-align:left;border-bottom:1px solid #e2e8f0;background:#f8fafc;font-size:13px;">${escapeHtml(h)}</th>`,
    )
    .join("");
  const rows = (table.rows || [])
    .map((row, idx) => {
      const cells = row
        .map((cell, colIdx) => {
          const raw = String(cell ?? "");
          let content;
          if (colIdx === statusColumn) {
            content = statusBadge(raw === "resolved" ? "resolved" : raw === "open" ? "open" : raw);
          } else if (/^(OK|PASS|✅|KO|FAIL|❌|SKIP|—|-)$/i.test(raw)) {
            content = formatResultBadge(raw);
          } else if (colIdx === 0 && /^[a-f0-9]{7,40}$/i.test(raw)) {
            content = inlineCode(raw);
          } else if (raw.includes("/") && colIdx <= 1) {
            content = inlineCode(raw);
          } else {
            content = escapeHtml(raw);
          }
          return `<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:13px;">${content}</td>`;
        })
        .join("");
      return `<tr${idx % 2 ? ' style="background:#fafafa;"' : ""}>${cells}</tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <tr>${headers}</tr>
    ${rows}
  </table>`;
}

function buildCommitsBlock(commits) {
  if (!commits?.length) return "";
  const rows = commits.map((commit) => [
    commit.hash || commit.shortHash || "—",
    commit.subject || commit.message || "—",
    commit.date || "—",
    commit.branch || "—",
    commit.filesChanged != null ? String(commit.filesChanged) : "—",
    commit.insertions != null && commit.deletions != null
      ? `+${commit.insertions}/-${commit.deletions}`
      : "—",
    (commit.topFiles || commit.highlights || []).slice(0, 3).join(", ") || "—",
  ]);

  return `<tr><td style="padding:8px 36px 20px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Commits de la session (${commits.length})</h2>
    ${buildGenericTable({
      headers: ["Hash", "Message", "Date", "Branche", "Fichiers", "Δ lignes", "Fichiers clés"],
      rows,
    })}
  </td></tr>`;
}

function buildSectionsBlock(sections) {
  if (!sections?.length) return "";
  const blocks = sections
    .map((section) => {
      const style = STATUS_STYLES[section.status || "info"] || STATUS_STYLES.info;
      return `<div style="background:${style.bg};border:1px solid ${style.border};border-left:4px solid ${style.accent};border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;font-size:17px;color:${style.accent};">${escapeHtml(section.title || style.label)}</h2>
        ${section.body ? renderParagraphs(section.body) : ""}
        ${renderList(section.items)}
      </div>`;
    })
    .join("");

  return `<tr><td style="padding:8px 36px 20px;">${blocks}</td></tr>`;
}

function buildTablesBlock(tables) {
  if (!tables?.length) return "";
  const blocks = tables
    .map(
      (table) => `<div style="margin-bottom:20px;">
      ${table.title ? `<h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">${escapeHtml(table.title)}</h2>` : ""}
      ${buildGenericTable(table)}
    </div>`,
    )
    .join("");

  return `<tr><td style="padding:8px 36px 24px;">${blocks}</td></tr>`;
}

function buildNextStepsBlock(nextSteps) {
  if (!nextSteps?.length) return "";
  return `<tr><td style="padding:8px 36px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Prochaines étapes</h2>
    ${renderList(nextSteps, { ordered: true })}
  </td></tr>`;
}

function buildFooterBlock(footer) {
  if (!footer) return "";
  return `<tr>
    <td style="padding:16px 36px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
      ${renderParagraphs(footer)}
    </td>
  </tr>`;
}

function loadTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, "utf8");
}

function fillTemplate(parts, title) {
  return loadTemplate()
    .replace("{{TITLE}}", escapeHtml(title || "JobbingTrack — Récap agent"))
    .replace("{{HEADER}}", parts.header || "")
    .replace("{{KPIS}}", parts.kpis || "")
    .replace("{{SUMMARY}}", parts.summary || "")
    .replace("{{WORK_ITEMS}}", parts.workItems || "")
    .replace("{{ISSUES}}", parts.issues || "")
    .replace("{{COMMITS}}", parts.commits || "")
    .replace("{{SECTIONS}}", parts.sections || "")
    .replace("{{TABLES}}", parts.tables || "")
    .replace("{{NEXT_STEPS}}", parts.nextSteps || "")
    .replace("{{FOOTER}}", parts.footer || "");
}

function buildAgentRecapHtml(data = {}) {
  const parts = {
    header: buildHeaderBlock(data),
    kpis: buildKpiBlock(data.kpis),
    summary: buildSummaryBlock(data.summary),
    workItems: buildWorkItemsBlock(data.workItems),
    issues: buildIssuesBlock(data.issues),
    commits: buildCommitsBlock(data.commits),
    sections: buildSectionsBlock(data.sections),
    tables: buildTablesBlock(data.tables),
    nextSteps: buildNextStepsBlock(data.nextSteps),
    footer: buildFooterBlock(data.footer),
  };
  return fillTemplate(parts, data.documentTitle || data.title);
}

function parseRecapJson(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON récap invalide (objet attendu)");
  }
  return parsed;
}

if (require.main === module) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: node scripts/ops/build-agent-recap-html.cjs recap.json > out.html");
    process.exit(2);
  }
  const raw = fs.readFileSync(path.resolve(jsonPath), "utf8");
  process.stdout.write(buildAgentRecapHtml(parseRecapJson(raw)));
}

module.exports = {
  buildAgentRecapHtml,
  parseRecapJson,
  escapeHtml,
  STATUS_STYLES,
};
