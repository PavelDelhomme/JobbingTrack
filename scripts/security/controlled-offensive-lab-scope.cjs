#!/usr/bin/env node

/**
 * Plan-only scope manifest for controlled offensive lab validation.
 *
 * This script never sends payloads. It combines the target preflight with a
 * bounded service/scenario matrix so the operator can validate the campaign
 * perimeter before any explicit lab runner is used.
 */

const {
  DEFAULT_SCENARIOS,
  evaluatePreflight,
} = require("./controlled-offensive-preflight.cjs");

const SERVICES = [
  {
    id: "api-gateway",
    exposure: "public-entrypoint",
    basePath: "/api/v1",
    scenarios: [
      "remote-host",
      "url-injection",
      "header-spoofing",
      "path-traversal",
    ],
  },
  {
    id: "auth-service",
    exposure: "gateway-routed",
    basePath: "/api/v1/auth",
    scenarios: ["shell-command", "url-injection", "header-spoofing"],
  },
  {
    id: "application-service",
    exposure: "gateway-routed",
    basePath: "/api/v1/applications",
    scenarios: ["url-injection", "path-traversal", "header-spoofing"],
  },
  {
    id: "notification-service",
    exposure: "internal-api",
    basePath: "/api/v1/notifications",
    scenarios: ["remote-host", "header-spoofing"],
  },
  {
    id: "security-service",
    exposure: "internal-api",
    basePath: "/api/v1/security",
    scenarios: ["url-injection", "header-spoofing", "path-traversal"],
  },
  {
    id: "monitoring-agent-rs",
    exposure: "monitoring-readonly",
    basePath: "/health",
    scenarios: ["remote-host", "header-spoofing"],
  },
];

function parseArgs(argv) {
  const options = {
    target: process.env.SECURITY_TEST_TARGET || "http://localhost:5002",
    environment: process.env.SECURITY_TEST_ENV || "local",
    service: null,
    scenario: null,
    json: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      continue;
    }
    if (arg.startsWith("--environment=")) {
      options.environment = arg.slice("--environment=".length);
      continue;
    }
    if (arg.startsWith("--service=")) {
      options.service = arg.slice("--service=".length);
      continue;
    }
    if (arg.startsWith("--scenario=")) {
      options.scenario = arg.slice("--scenario=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function buildScope(options) {
  const selectedServices = SERVICES.filter((service) => {
    if (options.service && service.id !== options.service) return false;
    if (options.scenario && !service.scenarios.includes(options.scenario)) {
      return false;
    }
    return true;
  });

  const selectedScenarios = [
    ...new Set(
      selectedServices.flatMap((service) =>
        service.scenarios.filter((scenario) =>
          options.scenario ? scenario === options.scenario : true,
        ),
      ),
    ),
  ];

  const preflight = evaluatePreflight({
    target: options.target,
    environment: options.environment,
    scenarios: selectedScenarios.length ? selectedScenarios : DEFAULT_SCENARIOS,
    allowExternal: process.env.SECURITY_TEST_ALLOW_EXTERNAL === "true",
    allowProductionWindow:
      process.env.SECURITY_PRODUCTION_TEST_WINDOW_APPROVED === "true",
  });

  const checks = selectedServices.flatMap((service) =>
    service.scenarios
      .filter((scenario) => (options.scenario ? scenario === options.scenario : true))
      .map((scenario) => ({
        service: service.id,
        exposure: service.exposure,
        basePath: service.basePath,
        scenario,
        mode: "plan-only",
        willRunPayload: false,
        requiredApproval:
          service.exposure === "public-entrypoint"
            ? "local-lab"
            : "internal-lab",
      })),
  );

  return {
    status: preflight.status === "blocked" ? "blocked" : "ready_for_review",
    dryRun: true,
    target: preflight.target,
    environment: preflight.environment,
    preflightStatus: preflight.status,
    issues: preflight.issues,
    checkCount: checks.length,
    checks,
    nextStep:
      preflight.status === "allowed"
        ? "Review this scope with the product owner before enabling any explicit lab runner."
        : preflight.nextStep,
  };
}

function printHuman(scope) {
  console.log(`Status: ${scope.status}`);
  console.log(`Preflight: ${scope.preflightStatus}`);
  console.log(`Target: ${scope.target.raw}`);
  console.log(`Environment: ${scope.environment}`);
  console.log(`Checks: ${scope.checkCount}`);
  console.log("");
  for (const check of scope.checks) {
    console.log(
      `- ${check.service} ${check.basePath} :: ${check.scenario} [${check.mode}]`,
    );
  }
  if (scope.issues.length) {
    console.log("");
    console.log("Issues:");
    for (const issue of scope.issues) {
      console.log(`- [${issue.severity}] ${issue.message}`);
    }
  }
  console.log("");
  console.log(`Next step: ${scope.nextStep}`);
}

function main() {
  const options = parseArgs(process.argv);
  const scope = buildScope(options);
  if (options.json) {
    console.log(JSON.stringify(scope, null, 2));
  } else {
    printHuman(scope);
  }
  process.exitCode = scope.status === "blocked" ? 2 : 0;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  SERVICES,
  buildScope,
  parseArgs,
};
