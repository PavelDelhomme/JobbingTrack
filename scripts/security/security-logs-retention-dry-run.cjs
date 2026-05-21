#!/usr/bin/env node

/**
 * Dry-run retention report for security_logs.
 *
 * Read-only: this script only runs SELECT queries through the Postgres
 * container and prints the rows that would become archive/purge candidates
 * according to docs/security/SECURITY_LOGS_RETENTION.md.
 */

const { execFileSync } = require("node:child_process");

const POSTGRES_CONTAINER =
  process.env.POSTGRES_CONTAINER || "jobbingtrack-postgres";

const RETENTION_DAYS = {
  critical: Number(process.env.SECURITY_LOGS_RETENTION_CRITICAL_DAYS || 180),
  high: Number(process.env.SECURITY_LOGS_RETENTION_HIGH_DAYS || 90),
  standard: Number(process.env.SECURITY_LOGS_RETENTION_STANDARD_DAYS || 45),
  noise: Number(process.env.SECURITY_LOGS_RETENTION_NOISE_DAYS || 14),
};

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

function main() {
  const exists = runPsql("select to_regclass('public.security_logs')");
  if (exists !== "security_logs") {
    throw new Error("Table public.security_logs introuvable");
  }

  const sizeRows = parseRows(
    runPsql(`
      select
        pg_size_pretty(pg_total_relation_size('public.security_logs')) as total_size,
        pg_size_pretty(pg_relation_size('public.security_logs')) as table_size,
        pg_size_pretty(pg_indexes_size('public.security_logs')) as indexes_size,
        count(*)::text as rows_count,
        coalesce(min(timestamp)::text, '-') as oldest,
        coalesce(max(timestamp)::text, '-') as newest
      from public.security_logs;
    `),
  );

  const classRows = parseRows(
    runPsql(`
      with classified as (
        select
          case
            when lower(level) in ('critical') then 'critical'
            when lower(level) in ('error', 'high') then 'high'
            when lower(level) in ('warning', 'warn', 'medium') then 'standard'
            else 'noise'
          end as retention_class,
          timestamp
        from public.security_logs
      ),
      policy as (
        select 'critical' as retention_class, ${RETENTION_DAYS.critical}::int as keep_days
        union all select 'high', ${RETENTION_DAYS.high}
        union all select 'standard', ${RETENTION_DAYS.standard}
        union all select 'noise', ${RETENTION_DAYS.noise}
      )
      select
        p.retention_class,
        p.keep_days::text,
        count(c.*)::text as total_rows,
        count(c.*) filter (where c.timestamp < now() - (p.keep_days || ' days')::interval)::text as archive_candidates,
        coalesce(min(c.timestamp)::text, '-') as oldest,
        coalesce(max(c.timestamp)::text, '-') as newest
      from policy p
      left join classified c on c.retention_class = p.retention_class
      group by p.retention_class, p.keep_days
      order by
        case p.retention_class
          when 'critical' then 1
          when 'high' then 2
          when 'standard' then 3
          else 4
        end;
    `),
  );

  console.log("# Security logs retention dry-run");
  console.log("");
  console.log(`Container: ${POSTGRES_CONTAINER}`);
  console.log("Mode: read-only, no archive and no delete");
  console.log("");
  printTable(
    ["total_size", "table_size", "indexes_size", "rows_count", "oldest", "newest"],
    sizeRows,
  );
  console.log("");
  printTable(
    [
      "class",
      "keep_days",
      "total_rows",
      "archive_candidates",
      "oldest",
      "newest",
    ],
    classRows,
  );
  console.log("");
  console.log(
    "Next step: archive candidates to JSONL gzip with a SHA-256 manifest, verify counts, then run a separate purge command after validation.",
  );
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
