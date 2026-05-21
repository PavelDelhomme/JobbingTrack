#!/usr/bin/env node

/**
 * Export security_logs archive candidates to JSONL gzip + manifest.
 * Does NOT delete rows from PostgreSQL — use only after dry-run validation.
 *
 * @see docs/security/SECURITY_LOGS_RETENTION.md
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { execFileSync } = require("node:child_process");

const POSTGRES_CONTAINER =
  process.env.POSTGRES_CONTAINER || "jobbingtrack-postgres";

const RETENTION_DAYS = {
  critical: Number(process.env.SECURITY_LOGS_RETENTION_CRITICAL_DAYS || 180),
  high: Number(process.env.SECURITY_LOGS_RETENTION_HIGH_DAYS || 90),
  standard: Number(process.env.SECURITY_LOGS_RETENTION_STANDARD_DAYS || 45),
  noise: Number(process.env.SECURITY_LOGS_RETENTION_NOISE_DAYS || 14),
};

const VALID_CLASSES = Object.keys(RETENTION_DAYS);

function runPsql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-e",
      `PSQL_QUERY=${sql}`,
      POSTGRES_CONTAINER,
      "sh",
      "-lc",
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -c "$PSQL_QUERY"',
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function classificationCte() {
  return `
    classified AS (
      SELECT
        sl.*,
        CASE
          WHEN lower(sl.level) IN ('critical') THEN 'critical'
          WHEN lower(sl.level) IN ('error', 'high') THEN 'high'
          WHEN lower(sl.level) IN ('warning', 'warn', 'medium') THEN 'standard'
          ELSE 'noise'
        END AS retention_class
      FROM public.security_logs sl
    )
  `;
}

function countCandidates(retentionClass) {
  const keepDays = RETENTION_DAYS[retentionClass];
  const count = runPsql(`
    WITH ${classificationCte()}
    SELECT count(*)::text
    FROM classified c
    WHERE c.retention_class = '${retentionClass}'
      AND c.timestamp < now() - interval '${keepDays} days';
  `);
  return Number(count) || 0;
}

function fetchCandidateJsonLines(retentionClass, limit) {
  const keepDays = RETENTION_DAYS[retentionClass];
  const output = runPsql(`
    WITH ${classificationCte()}
    SELECT row_to_json(c)::text
    FROM classified c
    WHERE c.retention_class = '${retentionClass}'
      AND c.timestamp < now() - interval '${keepDays} days'
    ORDER BY c.timestamp ASC
    LIMIT ${limit};
  `);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

function parseArgs(argv) {
  const classes = [];
  let limit = Number(process.env.SECURITY_LOGS_ARCHIVE_BATCH || 5000);

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      classes.push(...VALID_CLASSES);
      continue;
    }
    if (arg.startsWith("--class=")) {
      classes.push(arg.slice("--class=".length));
      continue;
    }
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      continue;
    }
    throw new Error(`Argument inconnu: ${arg}`);
  }

  if (classes.length === 0) {
    classes.push("noise", "standard");
  }

  for (const cls of classes) {
    if (!VALID_CLASSES.includes(cls)) {
      throw new Error(`Classe invalide: ${cls}`);
    }
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Limite invalide");
  }

  return { classes: [...new Set(classes)], limit };
}

function main() {
  const { classes, limit } = parseArgs(process.argv);
  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.resolve(
    process.env.SECURITY_LOGS_ARCHIVE_DIR ||
      path.join("data/archives/security-logs", stamp),
  );
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    container: POSTGRES_CONTAINER,
    policyDays: RETENTION_DAYS,
    batchLimit: limit,
    files: [],
    note: "Export only — no rows deleted from security_logs",
  };

  console.log(`# Security logs archive export`);
  console.log(`Output: ${outDir}`);
  console.log(`Classes: ${classes.join(", ")}`);
  console.log("");

  for (const retentionClass of classes) {
    const totalCandidates = countCandidates(retentionClass);
    const lines = fetchCandidateJsonLines(
      retentionClass,
      Math.min(limit, totalCandidates),
    );
    const jsonl = `${lines.join("\n")}\n`;
    const gz = zlib.gzipSync(jsonl, { level: 9 });
    const fileName = `${retentionClass}.jsonl.gz`;
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, gz);

    const sha256 = crypto.createHash("sha256").update(gz).digest("hex");
    manifest.files.push({
      class: retentionClass,
      keepDays: RETENTION_DAYS[retentionClass],
      candidatesTotal: totalCandidates,
      exportedRows: lines.length,
      fileName,
      bytes: gz.length,
      sha256,
    });

    console.log(
      `${retentionClass}: exported ${lines.length}/${totalCandidates} rows → ${fileName} (${gz.length} bytes, sha256=${sha256.slice(0, 12)}…)`,
    );
  }

  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("");
  console.log(`Manifest: ${manifestPath}`);
  console.log("No purge performed. Verify counts before any DELETE.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
