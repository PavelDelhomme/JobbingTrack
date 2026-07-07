#!/usr/bin/env node

/**
 * Construit et envoie un récap agent complet (git auto + enrichissement manuel/agent).
 *
 * Usage:
 *   node scripts/ops/send-session-recap.cjs \
 *     --since 2026-07-06 \
 *     --enrichment scripts/ops/templates/session-recap-2026-07-07.enrichment.json \
 *     --subject "[JobbingTrack] Récap détaillé session 06-07/07/2026"
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { buildAgentRecapHtml, parseRecapJson } = require("./build-agent-recap-html.cjs");
const { loadRootEnv } = require("./load-root-env.cjs");
const http = require("node:http");

const ROOT = path.join(__dirname, "../..");

function parseArgs(argv) {
  const args = {
    since: "",
    until: "",
    branch: "dev",
    sessionBranch: "",
    enrichment: "",
    subject: "",
    outHtml: "",
    send: true,
    to: [],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--since") args.since = argv[++i] || "";
    else if (arg === "--until") args.until = argv[++i] || "";
    else if (arg === "--branch") args.branch = argv[++i] || "dev";
    else if (arg === "--session-branch") args.sessionBranch = argv[++i] || "";
    else if (arg === "--enrichment") args.enrichment = argv[++i] || "";
    else if (arg === "--subject") args.subject = argv[++i] || "";
    else if (arg === "--out-html") args.outHtml = argv[++i] || "";
    else if (arg === "--no-send") args.send = false;
    else if (arg === "--to") args.to.push(argv[++i] || "");
  }
  return args;
}

function collectGit(args) {
  const collectArgs = [
    path.join(__dirname, "collect-session-recap-git.cjs"),
    "--since",
    args.since,
    "--branch",
    args.branch,
  ];
  if (args.until) collectArgs.push("--until", args.until);
  if (args.sessionBranch) collectArgs.push("--session-branch", args.sessionBranch);
  const raw = execFileSync(process.execPath, collectArgs, { encoding: "utf8" });
  return JSON.parse(raw);
}

function deepMerge(base, overlay) {
  const out = { ...base };
  for (const [key, value] of Object.entries(overlay || {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      out[key] = value;
    } else if (typeof value === "object") {
      out[key] = deepMerge(base[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function postJson(url, payload, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(payload);
    const req = http.request(
      parsed,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
        timeout: 30000,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let data = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            /* keep */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ status: res.statusCode, data });
          else reject(new Error(`HTTP ${res.statusCode}: ${typeof data === "string" ? data : JSON.stringify(data)}`));
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function defaultRecipients(env) {
  return [
    env.AGENT_RECAP_EMAIL,
    env.TEST_REAL_EMAIL,
    env.EMAIL_TRIAGE_DIGEST_RECIPIENT,
    env.ADMIN_EMAIL,
    "pauldelhomme.pro@gmail.com",
    "dev@delhomme.ovh",
    "admin@delhomme.ovh",
  ]
    .flatMap((v) => String(v || "").split(","))
    .map((e) => e.trim())
    .filter(Boolean)
    .filter((e, i, arr) => arr.indexOf(e) === i);
}

async function sendRecap(html, subject, recipients) {
  const env = loadRootEnv(ROOT);
  const secret = env.SECURITY_INTERNAL_SECRET;
  if (!secret) throw new Error("SECURITY_INTERNAL_SECRET absent");
  const port = env.NOTIFICATION_SERVICE_PORT || "5014";
  const endpoint = `http://127.0.0.1:${port}/api/v1/notifications/internal/security-alert-email`;
  const results = [];
  for (const to of recipients) {
    const { status, data } = await postJson(
      endpoint,
      {
        to,
        subject,
        html,
        alert: { severity: "INFO", source: "agent-recap", kind: "AGENT_RECAP", title: subject },
      },
      { "X-Internal-Secret": secret },
    );
    results.push({ to, status, emailLogId: data?.emailLogId || null });
    console.log(`[send-session-recap] ${to} → HTTP ${status}`);
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.since) {
    console.error("Usage: --since YYYY-MM-DD --enrichment fichier.json --subject \"...\"");
    process.exit(2);
  }

  const skeleton = collectGit(args);
  let recap = skeleton;
  if (args.enrichment) {
    const enrichment = JSON.parse(fs.readFileSync(path.resolve(args.enrichment), "utf8"));
    recap = deepMerge(skeleton, enrichment);
    if (enrichment.commits?.length) recap.commits = enrichment.commits;
  }

  const html = buildAgentRecapHtml(parseRecapJson(recap));
  if (args.outHtml) fs.writeFileSync(path.resolve(args.outHtml), html, "utf8");

  const subject =
    args.subject ||
    `[JobbingTrack] Recap agent ${args.since}${args.until ? ` → ${args.until}` : ""}`;

  if (args.send) {
    const env = loadRootEnv(ROOT);
    const recipients = args.to.length ? args.to : defaultRecipients(env);
    const results = await sendRecap(html, subject, recipients);
    console.log(JSON.stringify({ success: true, subject, recipients: results }, null, 2));
  } else {
    process.stdout.write(html);
  }
}

main().catch((err) => {
  console.error("[send-session-recap]", err.message);
  process.exit(1);
});
