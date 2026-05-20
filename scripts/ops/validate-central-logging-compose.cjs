#!/usr/bin/env node

/**
 * Valide que les services du profil full équipés de centralLogger ont bien
 * l'environnement nécessaire dans docker-compose.yml.
 *
 * Usage:
 *   node scripts/ops/validate-central-logging-compose.cjs
 */

const { execFileSync } = require("node:child_process");

const EXPECTED_METRICS_URL = "http://jobbingtrack-metrics-aggregator:3014";

const SERVICES_WITH_CENTRAL_LOGGER = [
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

function readComposeConfig() {
  const raw = execFileSync(
    "docker",
    ["compose", "config", "--format", "json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        COMPOSE_PROFILES: process.env.COMPOSE_PROFILES || "full",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return JSON.parse(raw);
}

function serviceNameFor(composeServiceName) {
  return `jobbingtrack-${composeServiceName}`;
}

function validateService(compose, serviceName) {
  const service = compose.services?.[serviceName];
  const failures = [];

  if (!service) {
    return [`service absent du docker compose: ${serviceName}`];
  }

  const profiles = service.profiles || [];
  const alwaysEnabled = profiles.length === 0;
  if (!alwaysEnabled && !profiles.includes("full")) {
    failures.push(`${serviceName}: profil full absent`);
  }

  const env = service.environment || {};
  const centralLogging = env.ENABLE_CENTRAL_LOGGING;
  if (String(centralLogging).toLowerCase() === "false") {
    failures.push(`${serviceName}: ENABLE_CENTRAL_LOGGING=false`);
  }
  if (centralLogging === undefined || centralLogging === null || centralLogging === "") {
    failures.push(`${serviceName}: ENABLE_CENTRAL_LOGGING manquant`);
  }

  if (env.METRICS_SERVICE_URL !== EXPECTED_METRICS_URL) {
    failures.push(
      `${serviceName}: METRICS_SERVICE_URL invalide (${env.METRICS_SERVICE_URL || "absent"})`,
    );
  }

  const expectedServiceName = serviceNameFor(serviceName);
  if (env.SERVICE_NAME !== expectedServiceName) {
    failures.push(
      `${serviceName}: SERVICE_NAME=${env.SERVICE_NAME || "absent"} (attendu ${expectedServiceName})`,
    );
  }

  return failures;
}

function main() {
  const compose = readComposeConfig();
  const failures = SERVICES_WITH_CENTRAL_LOGGER.flatMap((serviceName) =>
    validateService(compose, serviceName),
  );

  if (failures.length > 0) {
    console.error("Central logging compose validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Central logging compose validation OK (${SERVICES_WITH_CENTRAL_LOGGER.length} services).`,
  );
}

main();
