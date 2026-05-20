#!/usr/bin/env node

/**
 * Smoke runtime du central logging.
 *
 * Le script injecte un WARN non destructif via `src/utils/centralLogger.js`
 * dans chaque service attendu, puis vérifie dans Postgres que `aggregated_logs`
 * contient une ligne par `serviceName` pour le smoke courant.
 */

const { execFileSync } = require("node:child_process");

const SERVICES = [
  "api-gateway",
  "auth-service",
  "application-service",
  "company-service",
  "contact-service",
  "interview-service",
  "call-service",
  "event-service",
  "followup-service",
  "profile-service",
  "notification-service",
  "dashboard-service",
  "workflow-service",
  "security-service",
  "deployment-service",
];

const smokeId = `central-logging-smoke-${new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14)}`;

function runDockerCompose(args, options = {}) {
  return execFileSync("docker", ["compose", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    env: { ...process.env, COMPOSE_PROFILES: process.env.COMPOSE_PROFILES || "full" },
  });
}

function readMetricsApiKey() {
  if (process.env.METRICS_API_KEY) return process.env.METRICS_API_KEY;
  return runDockerCompose([
    "exec",
    "-T",
    "jobbingtrack-metrics-aggregator",
    "sh",
    "-lc",
    'printf %s "$METRICS_API_KEY"',
  ]).trim();
}

function emitServiceSmoke(serviceName, metricsApiKey) {
  const nodeCode = `
const candidates = ["/app/src/utils/centralLogger", "./src/utils/centralLogger"];
let logger;
let lastError;
for (const candidate of candidates) {
  try {
    logger = require(candidate);
    break;
  } catch (error) {
    lastError = error;
  }
}
if (!logger) {
  throw lastError || new Error("centralLogger introuvable");
}
const service = process.env.SERVICE_NAME || "unknown";
logger.addLog("WARN", "central logging smoke", {
  smokeId: process.env.CENTRAL_LOGGING_SMOKE_ID,
  service,
  source: "scripts/ops/smoke-central-logging-runtime.cjs",
});
const flush = logger.flushLogs || logger.flush;
Promise.resolve(flush.call(logger))
  .then(() => setTimeout(() => process.exit(0), 100))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  runDockerCompose(
    [
      "exec",
      "-T",
      "-e",
      `CENTRAL_LOGGING_SMOKE_ID=${smokeId}`,
      "-e",
      `METRICS_API_KEY=${metricsApiKey}`,
      serviceName,
      "node",
      "-e",
      nodeCode,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

function queryAggregatedLogs() {
  const sql = `
SELECT "serviceName", count(*) AS count, max(timestamp) AS newest
FROM aggregated_logs
WHERE metadata::text LIKE '%${smokeId}%'
GROUP BY "serviceName"
ORDER BY "serviceName";
`;
  const sqlForShell = sql.replace(/\n/g, " ").replace(/"/g, '\\"');
  const output = runDockerCompose([
    "exec",
    "-T",
    "postgres",
    "sh",
    "-lc",
    `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -F '|' -c "${sqlForShell}"`,
  ]).trim();

  if (!output) return new Map();
  return new Map(
    output.split("\n").map((line) => {
      const [serviceName, count, newest] = line.split("|");
      return [serviceName, { count: Number(count), newest }];
    }),
  );
}

function main() {
  const metricsApiKey = readMetricsApiKey();
  if (!metricsApiKey) {
    throw new Error("METRICS_API_KEY introuvable (env hôte et conteneur metrics-aggregator)");
  }

  const failures = [];
  for (const service of SERVICES) {
    process.stdout.write(`SMOKE ${service}... `);
    try {
      emitServiceSmoke(service, metricsApiKey);
      process.stdout.write("emit OK\n");
    } catch (error) {
      failures.push(`${service}: ${(error.stderr || error.message || error).toString().trim()}`);
      process.stdout.write("emit FAIL\n");
    }
  }

  const persisted = queryAggregatedLogs();
  const missing = SERVICES.map((service) => `jobbingtrack-${service}`).filter(
    (serviceName) => !persisted.has(serviceName),
  );

  console.log(`\nSmoke id: ${smokeId}`);
  console.log("Lignes persistées dans aggregated_logs:");
  for (const [serviceName, row] of persisted.entries()) {
    console.log(`- ${serviceName}: ${row.count} ligne(s), dernier=${row.newest}`);
  }

  if (failures.length > 0 || missing.length > 0) {
    console.error("\nCentral logging runtime smoke incomplet.");
    for (const failure of failures) console.error(`- emit ${failure}`);
    for (const serviceName of missing) console.error(`- persist manquant: ${serviceName}`);
    process.exit(1);
  }

  console.log(`\nCentral logging runtime smoke OK (${SERVICES.length}/${SERVICES.length}).`);
}

main();
