#!/usr/bin/env node

/**
 * Verify and stage security_logs archive exports.
 *
 * Default mode is read-only: manifest + gzip SHA-256 + JSONL shape checks.
 * Use --load-staging to import rows into public.security_logs_restore_staging.
 * This script never inserts into or deletes from public.security_logs.
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

const DEFAULT_ARCHIVE_DIR = path.join(
  "data/archives/security-logs",
  new Date().toISOString().slice(0, 10),
);

const SECURITY_LOG_FIELDS = [
  "id",
  "timestamp",
  "level",
  "category",
  "eventType",
  "message",
  "sourceIP",
  "userAgent",
  "userId",
  "endpoint",
  "method",
  "statusCode",
  "responseTime",
  "country",
  "city",
  "riskScore",
  "isBlocked",
  "blockReason",
  "metadata",
  "createdAt",
  "updatedAt",
  "retention_class",
];

function runPsql(sql, input) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      `PSQL_QUERY=${sql}`,
      POSTGRES_CONTAINER,
      "sh",
      "-lc",
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -c "$PSQL_QUERY"',
    ],
    {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
}

function parseArgs(argv) {
  const options = {
    archiveDir: path.resolve(
      process.env.SECURITY_LOGS_ARCHIVE_DIR || DEFAULT_ARCHIVE_DIR,
    ),
    classes: [],
    loadStaging: false,
    truncateStaging: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") {
      options.classes = ["critical", "high", "standard", "noise"];
      continue;
    }
    if (arg === "--load-staging") {
      options.loadStaging = true;
      continue;
    }
    if (arg === "--truncate-staging") {
      options.truncateStaging = true;
      continue;
    }
    if (arg.startsWith("--archive-dir=")) {
      options.archiveDir = path.resolve(arg.slice("--archive-dir=".length));
      continue;
    }
    if (arg.startsWith("--class=")) {
      options.classes.push(arg.slice("--class=".length));
      continue;
    }
    throw new Error(`Argument inconnu: ${arg}`);
  }

  options.classes = [...new Set(options.classes)];
  return options;
}

function readManifest(archiveDir) {
  const manifestPath = path.join(archiveDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest introuvable: ${manifestPath}`);
  }
  return {
    path: manifestPath,
    data: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
  };
}

function assertArchiveRow(row, fileName, lineNumber) {
  const missing = [
    "id",
    "timestamp",
    "level",
    "category",
    "eventType",
    "message",
  ].filter((field) => row[field] == null);
  if (missing.length > 0) {
    throw new Error(
      `${fileName}:${lineNumber} invalide, champs manquants: ${missing.join(", ")}`,
    );
  }

  const unknownFields = Object.keys(row).filter(
    (field) => !SECURITY_LOG_FIELDS.includes(field),
  );
  if (unknownFields.length > 0) {
    throw new Error(
      `${fileName}:${lineNumber} contient des champs inconnus: ${unknownFields.join(", ")}`,
    );
  }
}

function readArchiveFile(archiveDir, fileMeta) {
  const filePath = path.join(archiveDir, fileMeta.fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archive introuvable: ${filePath}`);
  }

  const gz = fs.readFileSync(filePath);
  const sha256 = crypto.createHash("sha256").update(gz).digest("hex");
  if (sha256 !== fileMeta.sha256) {
    throw new Error(
      `SHA-256 invalide pour ${fileMeta.fileName}: ${sha256} != ${fileMeta.sha256}`,
    );
  }

  const jsonl = zlib.gunzipSync(gz).toString("utf8").trim();
  const rows = jsonl
    ? jsonl.split("\n").map((line, index) => {
        const row = JSON.parse(line);
        assertArchiveRow(row, fileMeta.fileName, index + 1);
        return row;
      })
    : [];

  if (rows.length !== Number(fileMeta.exportedRows || 0)) {
    throw new Error(
      `Compteur incohérent pour ${fileMeta.fileName}: ${rows.length} lignes lues, manifest=${fileMeta.exportedRows}`,
    );
  }

  return { filePath, rows, sha256, bytes: gz.length };
}

function ensureStagingTable({ truncate }) {
  runPsql(`
    CREATE TABLE IF NOT EXISTS public.security_logs_restore_staging (
      archive_dir text NOT NULL,
      archive_file text NOT NULL,
      archive_class text NOT NULL,
      row_id text NOT NULL,
      source_timestamp timestamptz,
      payload jsonb NOT NULL,
      restored_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (archive_dir, archive_file, row_id)
    );
  `);
  if (truncate) {
    runPsql("TRUNCATE public.security_logs_restore_staging;");
  }
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function copyField(value) {
  if (value == null) return "\\N";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function loadRowsToStaging({ archiveDir, fileMeta, rows }) {
  if (rows.length === 0) return 0;

  const copyPayload = `${rows
    .map((row) =>
      [
        archiveDir,
        fileMeta.fileName,
        fileMeta.class,
        row.id,
        row.timestamp,
        JSON.stringify(row),
      ]
        .map(copyField)
        .join("\t"),
    )
    .join("\n")}\n`;

  runPsql(`
    DELETE FROM public.security_logs_restore_staging
    WHERE archive_dir = ${sqlLiteral(archiveDir)}
      AND archive_file = ${sqlLiteral(fileMeta.fileName)};
  `);
  runPsql(
    `
    COPY public.security_logs_restore_staging (
      archive_dir,
      archive_file,
      archive_class,
      row_id,
      source_timestamp,
      payload
    )
    FROM STDIN;
  `,
    copyPayload,
  );

  return rows.length;
}

function countAlreadyPresent(rowIds) {
  if (rowIds.length === 0) return 0;
  const ids = rowIds.map(sqlLiteral).join(",");
  const out = runPsql(`
    SELECT count(*)::text
    FROM public.security_logs
    WHERE id IN (${ids});
  `);
  return Number(out) || 0;
}

function main() {
  const options = parseArgs(process.argv);
  const manifest = readManifest(options.archiveDir);
  const files = Array.isArray(manifest.data.files) ? manifest.data.files : [];
  const selectedFiles =
    options.classes.length > 0
      ? files.filter((file) => options.classes.includes(file.class))
      : files;

  if (selectedFiles.length === 0) {
    throw new Error("Aucune archive à vérifier avec ces critères");
  }

  console.log("# Security logs archive restore check");
  console.log("");
  console.log(`Archive: ${options.archiveDir}`);
  console.log(`Manifest: ${manifest.path}`);
  console.log(`Mode: ${options.loadStaging ? "load-staging" : "dry-run"}`);
  console.log("Target table: public.security_logs_restore_staging");
  console.log("No write to public.security_logs.");
  console.log("");

  if (options.loadStaging) {
    ensureStagingTable({ truncate: options.truncateStaging });
  }

  let totalRows = 0;
  let totalExisting = 0;
  let totalLoaded = 0;

  for (const fileMeta of selectedFiles) {
    const archive = readArchiveFile(options.archiveDir, fileMeta);
    totalRows += archive.rows.length;
    const existing = countAlreadyPresent(archive.rows.map((row) => row.id));
    totalExisting += existing;

    let loaded = 0;
    if (options.loadStaging) {
      loaded = loadRowsToStaging({
        archiveDir: options.archiveDir,
        fileMeta,
        rows: archive.rows,
      });
      totalLoaded += loaded;
    }

    console.log(
      `${fileMeta.class}: verified ${archive.rows.length} rows from ${fileMeta.fileName} (${archive.bytes} bytes, sha256=${archive.sha256.slice(0, 12)}…)`,
    );
    console.log(
      `  already in security_logs: ${existing}; staging loaded/updated: ${loaded}`,
    );
  }

  console.log("");
  console.log(
    `Summary: verified=${totalRows}, already_in_security_logs=${totalExisting}, staging_loaded=${totalLoaded}`,
  );
  console.log(
    "Next step: compare staging payloads, restore manually if needed, then purge only after explicit validation.",
  );
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
