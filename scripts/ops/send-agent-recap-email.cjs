#!/usr/bin/env node

/**
 * Envoie un récap agent via notification-service (endpoint interne).
 * Usage:
 *   node scripts/ops/send-agent-recap-email.cjs --recap-json recap.json --subject "..."
 *   node scripts/ops/send-agent-recap-email.cjs --subject "..." --html-file rapport.html
 *   echo "corps" | node scripts/ops/send-agent-recap-email.cjs --subject "..."
 */

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { loadRootEnv } = require("./load-root-env.cjs");
const { buildAgentRecapHtml, parseRecapJson } = require("./build-agent-recap-html.cjs");

function parseArgs(argv) {
  const args = { recipients: [], subject: "", htmlFile: "", recapJson: "", text: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--subject") {
      args.subject = argv[++i] || "";
    } else if (arg === "--html-file") {
      args.htmlFile = argv[++i] || "";
    } else if (arg === "--recap-json") {
      args.recapJson = argv[++i] || "";
    } else if (arg === "--to") {
      args.recipients.push(argv[++i] || "");
    } else if (arg === "--text") {
      args.text = argv[++i] || "";
    }
  }
  return args;
}

function defaultRecipients(env) {
  const fromEnv = [
    env.AGENT_RECAP_EMAIL,
    env.TEST_REAL_EMAIL,
    env.EMAIL_TRIAGE_DIGEST_RECIPIENT,
    env.ADMIN_EMAIL,
    env.SECURITY_ALERT_EMAIL,
    env.CRASH_REPORT_EMAIL,
    "dev@delhomme.ovh",
    "admin@delhomme.ovh",
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((email) => email.trim())
    .filter(Boolean);

  return [...new Set(fromEnv)];
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
            /* keep raw */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data });
            return;
          }
          reject(new Error(`HTTP ${res.statusCode}: ${typeof data === "string" ? data : JSON.stringify(data)}`));
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout notification-service")));
    req.write(body);
    req.end();
  });
}

function textToHtml(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827;max-width:920px;margin:0 auto;padding:24px;"><pre style="white-space:pre-wrap;font-family:Consolas,Monaco,monospace;font-size:13px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">${escaped}</pre></body></html>`;
}

function resolveHtmlBody(args, stdinText) {
  if (args.recapJson) {
    const raw = fs.readFileSync(path.resolve(args.recapJson), "utf8");
    return buildAgentRecapHtml(parseRecapJson(raw));
  }

  let html = args.text;
  if (args.htmlFile) {
    html = fs.readFileSync(path.resolve(args.htmlFile), "utf8");
  }
  if (!html && stdinText) {
    html = stdinText;
  }
  if (!html) throw new Error("Corps email absent (--recap-json, --html-file, --text ou stdin)");

  const trimmed = html.trim();
  if (trimmed.startsWith("{")) {
    return buildAgentRecapHtml(parseRecapJson(trimmed));
  }
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return html;
  }
  return textToHtml(html);
}

async function main() {
  const rootDir = path.join(__dirname, "../..");
  const env = loadRootEnv(rootDir);
  const args = parseArgs(process.argv);

  const port = env.NOTIFICATION_SERVICE_PORT || "5014";
  const secret = env.SECURITY_INTERNAL_SECRET;
  if (!secret) throw new Error("SECURITY_INTERNAL_SECRET absent du .env");

  let stdinText = "";
  if (!process.stdin.isTTY && !args.recapJson && !args.htmlFile && !args.text) {
    stdinText = fs.readFileSync(0, "utf8");
  }

  const htmlBody = resolveHtmlBody(args, stdinText);

  const subject =
    args.subject ||
    `[JobbingTrack] Recap agent ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

  const recipients = args.recipients.length ? args.recipients : defaultRecipients(env);

  const endpoint = `http://127.0.0.1:${port}/api/v1/notifications/internal/security-alert-email`;
  const results = [];

  for (const to of recipients) {
    const payload = {
      to,
      subject,
      html: htmlBody,
      alert: {
        severity: "INFO",
        source: "agent-recap",
        kind: "AGENT_RECAP",
        title: subject,
      },
    };
    const { status, data } = await postJson(endpoint, payload, {
      "X-Internal-Secret": secret,
    });
    results.push({ to, status, emailLogId: data?.emailLogId || null });
    console.log(`[send-agent-recap-email] ${to} → HTTP ${status}`);
  }

  console.log(JSON.stringify({ success: true, subject, recipients: results }, null, 2));
}

main().catch((error) => {
  console.error("[send-agent-recap-email]", error.message);
  process.exit(1);
});
