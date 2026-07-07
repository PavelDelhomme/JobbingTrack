#!/usr/bin/env node

/**
 * Gabarit HTML récap agent — sections colorées OK / KO / en attente.
 * @used-by scripts/ops/send-agent-recap-email.cjs
 */

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE_PATH = path.join(__dirname, "templates/agent-recap-email.html");

const STATUS_STYLES = {
  ok: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    accent: "#15803d",
    label: "OK",
  },
  ko: {
    bg: "#fef2f2",
    border: "#fecaca",
    accent: "#b91c1c",
    label: "KO",
  },
  pending: {
    bg: "#fffbeb",
    border: "#fde68a",
    accent: "#a16207",
    label: "En attente",
  },
  info: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    accent: "#1d4ed8",
    label: "Info",
  },
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
  return `<code style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:13px;">${escapeHtml(text)}</code>`;
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

function renderList(items) {
  if (!items?.length) return "";
  const lis = items
    .map((item) => {
      const text =
        typeof item === "string"
          ? escapeHtml(item)
          : escapeHtml(item.text || item.label || "");
      return `<li style="margin-bottom:6px;">${text}</li>`;
    })
    .join("");
  return `<ul style="margin:0;padding-left:20px;font-size:14px;">${lis}</ul>`;
}

function buildHeaderBlock(data) {
  const eyebrow = escapeHtml(data.eyebrow || "JobbingTrack · Récap agent");
  const title = escapeHtml(data.title || "Récapitulatif session");
  const branch = data.branch ? inlineCode(data.branch) : "";
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
      ${branch ? `<p style="margin:12px 0 0;font-size:15px;opacity:0.92;">Branche ${branch}</p>` : ""}
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
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">Synthèse</h2>
      ${renderParagraphs(summary)}
    </td>
  </tr>`;
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
    .map((table) => {
      const headers = (table.headers || [])
        .map(
          (h) =>
            `<th style="padding:10px 14px;text-align:left;border-bottom:1px solid #e2e8f0;background:#f8fafc;">${escapeHtml(h)}</th>`,
        )
        .join("");
      const rows = (table.rows || [])
        .map((row, idx) => {
          const cells = row
            .map((cell, colIdx) => {
              const raw = String(cell ?? "");
              let content = escapeHtml(raw);
              if (/^(OK|PASS|✅)$/i.test(raw)) {
                content = `<span style="color:#15803d;font-weight:600;">OK</span>`;
              } else if (/^(KO|FAIL|❌)$/i.test(raw)) {
                content = `<span style="color:#b91c1c;font-weight:600;">KO</span>`;
              } else if (/^(SKIP|—|-)$/i.test(raw)) {
                content = `<span style="color:#64748b;">—</span>`;
              } else if (colIdx === 0 && raw.includes("/")) {
                content = inlineCode(raw);
              }
              return `<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:14px;">${content}</td>`;
            })
            .join("");
          return `<tr${idx % 2 ? ' style="background:#fafafa;"' : ""}>${cells}</tr>`;
        })
        .join("");

      return `<div style="margin-bottom:20px;">
        ${table.title ? `<h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">${escapeHtml(table.title)}</h2>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:14px;">
          <tr>${headers}</tr>
          ${rows}
        </table>
      </div>`;
    })
    .join("");

  return `<tr><td style="padding:8px 36px 24px;">${blocks}</td></tr>`;
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
    .replace("{{SECTIONS}}", parts.sections || "")
    .replace("{{TABLES}}", parts.tables || "")
    .replace("{{FOOTER}}", parts.footer || "");
}

function buildAgentRecapHtml(data = {}) {
  const parts = {
    header: buildHeaderBlock(data),
    kpis: buildKpiBlock(data.kpis),
    summary: buildSummaryBlock(data.summary),
    sections: buildSectionsBlock(data.sections),
    tables: buildTablesBlock(data.tables),
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
