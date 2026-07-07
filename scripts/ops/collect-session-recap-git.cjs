#!/usr/bin/env node

/**
 * Collecte commits git + squelette JSON récap agent (sections à compléter par l'agent).
 *
 * Usage:
 *   node scripts/ops/collect-session-recap-git.cjs --since 2026-07-06 --branch dev
 *   node scripts/ops/collect-session-recap-git.cjs --since 2026-07-06 --out /tmp/recap.json
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "../..");

function parseArgs(argv) {
  const args = {
    since: "",
    until: "",
    branch: "dev",
    base: "",
    out: "",
    title: "",
    sessionBranch: "",
    todoIds: [],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--since") args.since = argv[++i] || "";
    else if (arg === "--until") args.until = argv[++i] || "";
    else if (arg === "--branch") args.branch = argv[++i] || "dev";
    else if (arg === "--base") args.base = argv[++i] || "";
    else if (arg === "--out") args.out = argv[++i] || "";
    else if (arg === "--title") args.title = argv[++i] || "";
    else if (arg === "--session-branch") args.sessionBranch = argv[++i] || "";
    else if (arg === "--todo") args.todoIds.push(argv[++i] || "");
  }
  return args;
}

function git(args, cwd = ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function listCommits(args) {
  const range = args.base ? `${args.base}..${args.branch}` : args.branch;
  const logArgs = [
    "log",
    range,
    "--no-merges",
    `--format=%H|%h|%s|%ad|%an`,
    "--date=short",
  ];
  if (args.since) logArgs.splice(2, 0, `--since=${args.since}`);
  if (args.until) logArgs.splice(2, 0, `--until=${args.until}`);

  const raw = git(logArgs);
  if (!raw) return [];

  return raw.split("\n").map((line) => {
    const [fullHash, shortHash, subject, date, author] = line.split("|");
    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;
    let topFiles = [];
    try {
      const numstat = git(["show", shortHash, "--numstat", "--format="]);
      const rows = numstat
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const parts = row.split("\t");
          return {
            insertions: Number(parts[0]) || 0,
            deletions: Number(parts[1]) || 0,
            file: parts[2] || "",
          };
        });
      filesChanged = rows.length;
      insertions = rows.reduce((sum, r) => sum + r.insertions, 0);
      deletions = rows.reduce((sum, r) => sum + r.deletions, 0);
      topFiles = rows.slice(0, 8).map((r) => r.file);
    } catch {
      /* ignore stat errors */
    }
    return {
      hash: shortHash,
      fullHash,
      subject,
      date,
      author,
      branch: args.sessionBranch || args.branch,
      filesChanged,
      insertions,
      deletions,
      topFiles,
      highlights: [],
    };
  });
}

function listMergedBranches(args) {
  try {
    const range = args.base ? `${args.base}..${args.branch}` : args.branch;
    const raw = git(["log", range, "--merges", "--format=%s"]);
    if (!raw) return [];
    return raw
      .split("\n")
      .map((line) => line.replace(/^Merge branch '([^']+)'.*/, "$1"))
      .filter((name) => name && !name.startsWith("Merge "));
  } catch {
    return [];
  }
}

function buildSkeleton(args, commits) {
  const dateLabel = args.since || commits[commits.length - 1]?.date || new Date().toISOString().slice(0, 10);
  const title =
    args.title ||
    `Récap agent — session ${dateLabel}${args.until ? ` → ${args.until}` : ""}`;

  const workItems = args.todoIds.map((id) => ({
    id,
    title: `${id} — à compléter`,
    status: "pending",
    problem: "Décrire le symptôme ou la demande porteur",
    cause: "Cause racine identifiée (si connue)",
    solution: "Correctif / livrable appliqué",
    files: [],
    commits: [],
    tests: [{ command: "commande de validation", result: "OK|KO|SKIP", note: "" }],
  }));

  return {
    title,
    eyebrow: "JobbingTrack · Récap agent détaillé",
    branch: args.sessionBranch || args.branch,
    branches: listMergedBranches(args),
    date: new Date().toISOString(),
    meta: [
      { label: "Branche intégrée", value: args.branch, code: true },
      { label: "Période git", value: args.since ? `since ${args.since}` : args.base || "HEAD", code: true },
      { label: "Commits", value: String(commits.length), code: false },
    ],
    kpis: [
      { label: "Commits", value: String(commits.length), tone: "info" },
      { label: "Fichiers touchés", value: String(commits.reduce((s, c) => s + c.filesChanged, 0)), tone: "neutral" },
      { label: "Lignes +", value: String(commits.reduce((s, c) => s + c.insertions, 0)), tone: "ok" },
      { label: "Lignes −", value: String(commits.reduce((s, c) => s + c.deletions, 0)), tone: "warn" },
    ],
    summary:
      "Compléter : objectif de session, périmètre traité, état global (OK/KO/en attente validation porteur).",
    workItems,
    issues: [
      {
        problem: "Problème rencontré — à compléter",
        cause: "Cause",
        solution: "Solution apportée",
        status: "open",
        relatedCommits: [],
      },
    ],
    commits,
    sections: [
      {
        status: "ok",
        title: "Ce qui fonctionne",
        items: ["Compléter avec preuves (smokes, HTTP, Jest…)"],
      },
      {
        status: "pending",
        title: "En attente porteur",
        items: ["Validations TODOS_A_VALIDER…"],
      },
    ],
    tables: [
      {
        title: "Matrice tests / validations",
        headers: ["Commande / smoke", "Résultat", "Note"],
        rows: [["node scripts/…", "OK", ""]],
      },
    ],
    nextSteps: ["Prochain lot backlog (ex. BL-26-09/12)", "Validation porteur ligne …"],
    footer: "Pilotage : TODOS_A_VERIFIER mis à jour ; TODOS_A_VALIDER si validation rendu requise.",
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.since && !args.base) {
    console.error("Préciser --since YYYY-MM-DD ou --base <ref>..branch");
    process.exit(2);
  }

  const commits = listCommits(args);
  const skeleton = buildSkeleton(args, commits);
  const json = `${JSON.stringify(skeleton, null, 2)}\n`;

  if (args.out) {
    fs.writeFileSync(path.resolve(args.out), json, "utf8");
    console.error(`[collect-session-recap-git] ${commits.length} commits → ${args.out}`);
  } else {
    process.stdout.write(json);
  }
}

if (require.main === module) main();

module.exports = { listCommits, buildSkeleton, parseArgs };
