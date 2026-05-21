#!/usr/bin/env node

/**
 * Read-only inventory for network_threats before any cleanup.
 *
 * The report highlights historical lab/test rows and private Docker/network
 * addresses still visible in the Menaces UI. It never deletes or updates rows.
 */

const { execFileSync } = require("node:child_process");

const POSTGRES_CONTAINER =
  process.env.POSTGRES_CONTAINER || "jobbingtrack-postgres";

function parseArgs(argv) {
  const options = {
    limit: Number(process.env.SECURITY_THREATS_INVENTORY_LIMIT || 80),
    olderThanDays: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length));
      continue;
    }
    if (arg.startsWith("--older-than-days=")) {
      options.olderThanDays = Number(arg.slice("--older-than-days=".length));
      continue;
    }
    throw new Error(`Argument inconnu: ${arg}`);
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error("Limite invalide");
  }
  if (
    options.olderThanDays != null &&
    (!Number.isFinite(options.olderThanDays) || options.olderThanDays < 0)
  ) {
    throw new Error("older-than-days invalide");
  }

  return options;
}

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
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -F "|" -c "$PSQL_QUERY"',
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function parseRows(output) {
  if (!output) return [];
  return output.split("\n").map((line) => line.split("|"));
}

function printTable(headers, rows) {
  console.log(headers.join(" | "));
  console.log(headers.map(() => "---").join(" | "));
  for (const row of rows) {
    console.log(row.join(" | "));
  }
}

function whereClause(options) {
  if (options.olderThanDays == null) return "";
  return `WHERE "detectedAt" < now() - interval '${options.olderThanDays} days'`;
}

function classifiedThreatsCte(options) {
  return `
    WITH classified AS (
      SELECT
        id,
        "threatType" AS threat_type,
        "sourceIp" AS source_ip,
        "destIp" AS dest_ip,
        "destPort" AS dest_port,
        severity,
        "detectedAt" AS detected_at,
        blocked,
        CASE
          WHEN "sourceIp" LIKE '198.51.100.%'
            OR "sourceIp" LIKE '203.0.113.%'
            OR "sourceIp" LIKE '192.0.2.%'
            OR "sourceIp" LIKE '10.0.0.%'
            OR metadata::text ILIKE '%lab%'
            OR metadata::text ILIKE '%test%'
            THEN 'lab_test'
          WHEN "sourceIp" LIKE '10.%'
            OR "sourceIp" LIKE '192.168.%'
            OR "sourceIp" LIKE '172.16.%'
            OR "sourceIp" LIKE '172.17.%'
            OR "sourceIp" LIKE '172.18.%'
            OR "sourceIp" LIKE '172.19.%'
            OR "sourceIp" LIKE '172.20.%'
            OR "sourceIp" LIKE '172.21.%'
            OR "sourceIp" LIKE '172.22.%'
            OR "sourceIp" LIKE '172.23.%'
            OR "sourceIp" LIKE '172.24.%'
            OR "sourceIp" LIKE '172.25.%'
            OR "sourceIp" LIKE '172.26.%'
            OR "sourceIp" LIKE '172.27.%'
            OR "sourceIp" LIKE '172.28.%'
            OR "sourceIp" LIKE '172.29.%'
            OR "sourceIp" LIKE '172.30.%'
            OR "sourceIp" LIKE '172.31.%'
            THEN 'private_network'
          ELSE 'external_or_unknown'
        END AS inventory_bucket
      FROM public.network_threats
      ${whereClause(options)}
    )
  `;
}

function main() {
  const options = parseArgs(process.argv);
  const exists = runPsql("select to_regclass('public.network_threats')");
  if (exists !== "network_threats") {
    throw new Error("Table public.network_threats introuvable");
  }

  const cte = classifiedThreatsCte(options);
  const summaryRows = parseRows(
    runPsql(`
      ${cte}
      SELECT
        inventory_bucket,
        count(*)::text AS rows_count,
        count(*) FILTER (WHERE blocked)::text AS blocked_rows,
        count(*) FILTER (WHERE NOT blocked)::text AS unblocked_rows,
        count(*) FILTER (WHERE lower(severity) IN ('critical', 'high'))::text AS high_or_critical,
        coalesce(min(detected_at)::text, '-') AS oldest,
        coalesce(max(detected_at)::text, '-') AS newest
      FROM classified
      GROUP BY inventory_bucket
      ORDER BY
        CASE inventory_bucket
          WHEN 'lab_test' THEN 1
          WHEN 'private_network' THEN 2
          ELSE 3
        END;
    `),
  );

  const severityRows = parseRows(
    runPsql(`
      ${cte}
      SELECT
        inventory_bucket,
        severity,
        threat_type,
        blocked::text,
        count(*)::text
      FROM classified
      GROUP BY inventory_bucket, severity, threat_type, blocked
      ORDER BY inventory_bucket, severity, threat_type, blocked;
    `),
  );

  const sampleRows = parseRows(
    runPsql(`
      ${cte}
      SELECT
        inventory_bucket,
        threat_type,
        source_ip,
        coalesce(dest_ip, '-') AS dest_ip,
        coalesce(dest_port::text, '-') AS dest_port,
        severity,
        blocked::text,
        detected_at::text,
        id
      FROM classified
      ORDER BY
        CASE inventory_bucket
          WHEN 'lab_test' THEN 1
          WHEN 'private_network' THEN 2
          ELSE 3
        END,
        detected_at DESC
      LIMIT ${options.limit};
    `),
  );

  console.log("# Network threats inventory dry-run");
  console.log("");
  console.log(`Container: ${POSTGRES_CONTAINER}`);
  console.log("Mode: read-only, no update and no delete");
  console.log(
    `Filter: ${
      options.olderThanDays == null
        ? "all rows"
        : `older than ${options.olderThanDays} days`
    }`,
  );
  console.log("");
  printTable(
    [
      "bucket",
      "rows",
      "blocked",
      "unblocked",
      "high_or_critical",
      "oldest",
      "newest",
    ],
    summaryRows,
  );
  console.log("");
  printTable(["bucket", "severity", "type", "blocked", "rows"], severityRows);
  console.log("");
  printTable(
    [
      "bucket",
      "type",
      "source_ip",
      "dest_ip",
      "dest_port",
      "severity",
      "blocked",
      "detected_at",
      "id",
    ],
    sampleRows,
  );
  console.log("");
  console.log(
    "Next step: review lab/private buckets, export evidence if needed, then purge only after explicit validation.",
  );
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
