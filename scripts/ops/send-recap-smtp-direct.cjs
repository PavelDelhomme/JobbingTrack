#!/usr/bin/env node
/**
 * Envoi SMTP direct d'un récap (sans notification-service).
 * Usage:
 *   node scripts/ops/send-recap-smtp-direct.cjs --subject "..." --html-file f.html --to a@x --to b@y
 */
const fs = require("node:fs");
const path = require("node:path");
const nodemailer = require("nodemailer");
const { loadRootEnv } = require("./load-root-env.cjs");

function parseArgs(argv) {
  const args = { subject: "", htmlFile: "", text: "", to: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--subject") args.subject = argv[++i] || "";
    else if (a === "--html-file") args.htmlFile = argv[++i] || "";
    else if (a === "--text") args.text = argv[++i] || "";
    else if (a === "--to") args.to.push(argv[++i] || "");
  }
  return args;
}

async function main() {
  const env = loadRootEnv();
  const args = parseArgs(process.argv);
  if (!args.subject) throw new Error("--subject requis");
  const to = [...new Set(args.to.map((e) => e.trim()).filter(Boolean))];
  if (!to.length) throw new Error("--to requis");

  let html = args.text;
  if (args.htmlFile) {
    html = fs.readFileSync(path.resolve(args.htmlFile), "utf8");
  }
  if (!html) throw new Error("corps HTML/texte manquant");

  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || 587);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST/USER/PASS manquants");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from: env.SMTP_FROM || user,
    to: to.join(", "),
    replyTo: env.SMTP_REPLY_TO || undefined,
    subject: args.subject,
    html,
  });

  console.log("OK sent", { messageId: info.messageId, accepted: info.accepted, to });
}

main().catch((err) => {
  console.error("FAIL", err.message || err);
  process.exit(1);
});
