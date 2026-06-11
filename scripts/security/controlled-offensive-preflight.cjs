#!/usr/bin/env node

/**
 * Non destructive preflight for controlled offensive security tests.
 *
 * This script does not send attack payloads. It only checks whether a target
 * and a scenario are inside the authorized JobbingTrack lab/preprod scope.
 */

const net = require("node:net");

const DEFAULT_SCENARIOS = [
  "remote-host",
  "shell-command",
  "url-injection",
  "header-spoofing",
  "path-traversal",
];

function parseArgs(argv) {
  const options = {
    target: process.env.SECURITY_TEST_TARGET || "http://localhost:5002",
    environment: process.env.SECURITY_TEST_ENV || "local",
    scenarios: DEFAULT_SCENARIOS,
    allowExternal: process.env.SECURITY_TEST_ALLOW_EXTERNAL === "true",
    allowProductionWindow:
      process.env.SECURITY_PRODUCTION_TEST_WINDOW_APPROVED === "true",
    json: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--allow-external") {
      options.allowExternal = true;
      continue;
    }
    if (arg === "--allow-production-window") {
      options.allowProductionWindow = true;
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
    if (arg.startsWith("--scenarios=")) {
      options.scenarios = arg
        .slice("--scenarios=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.target) throw new Error("Missing --target");
  if (!options.scenarios.length) throw new Error("No scenarios selected");
  return options;
}

function parseTarget(rawTarget) {
  try {
    const url = new URL(rawTarget);
    return {
      raw: rawTarget,
      valid: true,
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? "443" : "80"),
      origin: url.origin,
    };
  } catch {
    return {
      raw: rawTarget,
      valid: false,
      hostname: "",
      reason: "Target must be a valid absolute URL",
    };
  }
}

function ipv4ToNumber(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p))) return null;
  return parts.reduce((acc, part) => (acc << 8) + part, 0) >>> 0;
}

function inCidr(ip, cidr) {
  const [base, bitsText] = cidr.split("/");
  const bits = Number(bitsText);
  const ipNum = ipv4ToNumber(ip);
  const baseNum = ipv4ToNumber(base);
  if (ipNum == null || baseNum == null || !Number.isInteger(bits)) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

function classifyHostname(hostname) {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower === "::1" ||
    lower === "[::1]"
  ) {
    return { scope: "local", safeByDefault: true };
  }

  const ipVersion = net.isIP(lower);
  if (ipVersion === 4) {
    if (
      inCidr(lower, "127.0.0.0/8") ||
      inCidr(lower, "10.0.0.0/8") ||
      inCidr(lower, "172.16.0.0/12") ||
      inCidr(lower, "192.168.0.0/16")
    ) {
      return { scope: "private", safeByDefault: true };
    }
    if (
      inCidr(lower, "192.0.2.0/24") ||
      inCidr(lower, "198.51.100.0/24") ||
      inCidr(lower, "203.0.113.0/24")
    ) {
      return { scope: "documentation-lab", safeByDefault: true };
    }
    return { scope: "public-ip", safeByDefault: false };
  }

  if (lower.endsWith(".test") || lower.endsWith(".invalid")) {
    return { scope: "reserved-domain", safeByDefault: true };
  }

  if (lower.includes("preprod") || lower.includes("staging")) {
    return { scope: "preprod-named", safeByDefault: false };
  }

  return { scope: "public-hostname", safeByDefault: false };
}

function evaluatePreflight(options) {
  const target = parseTarget(options.target);
  const environment = String(options.environment || "").toLowerCase();
  const productionLike = ["prod", "production", "live"].includes(environment);
  const hostnameClass = target.valid
    ? classifyHostname(target.hostname)
    : { scope: "invalid", safeByDefault: false };
  const issues = [];

  if (!target.valid) {
    issues.push({ severity: "blocker", message: target.reason });
  }

  if (target.valid && !["http:", "https:"].includes(target.protocol)) {
    issues.push({
      severity: "blocker",
      message: "Only http/https targets are supported by this preflight",
    });
  }

  if (productionLike && !options.allowProductionWindow) {
    issues.push({
      severity: "blocker",
      message:
        "Production-like environments require SECURITY_PRODUCTION_TEST_WINDOW_APPROVED=true or --allow-production-window",
    });
  }

  if (
    target.valid &&
    !hostnameClass.safeByDefault &&
    !options.allowExternal &&
    !productionLike
  ) {
    issues.push({
      severity: "approval",
      message:
        "Public/external targets require SECURITY_TEST_ALLOW_EXTERNAL=true or --allow-external",
    });
  }

  const status = issues.some((i) => i.severity === "blocker")
    ? "blocked"
    : issues.some((i) => i.severity === "approval")
      ? "needs_approval"
      : "allowed";

  return {
    status,
    dryRun: true,
    target,
    environment,
    targetScope: hostnameClass.scope,
    scenarios: options.scenarios.map((scenario) => ({
      id: scenario,
      action: "preflight-only",
      willRunPayload: false,
    })),
    issues,
    nextStep:
      status === "allowed"
        ? "Authorized for a bounded lab run; execute only the explicit scenario runner."
        : "Do not run active tests until the blockers/approvals are resolved.",
  };
}

function printHuman(result) {
  console.log(`Status: ${result.status}`);
  console.log(`Target: ${result.target.raw}`);
  console.log(`Environment: ${result.environment}`);
  console.log(`Target scope: ${result.targetScope}`);
  console.log(`Dry-run only: ${result.dryRun ? "yes" : "no"}`);
  console.log("");
  console.log("Scenarios:");
  for (const scenario of result.scenarios) {
    console.log(`- ${scenario.id}: ${scenario.action}, payload=${scenario.willRunPayload}`);
  }
  if (result.issues.length) {
    console.log("");
    console.log("Issues:");
    for (const issue of result.issues) {
      console.log(`- [${issue.severity}] ${issue.message}`);
    }
  }
  console.log("");
  console.log(`Next step: ${result.nextStep}`);
}

function main() {
  const options = parseArgs(process.argv);
  const result = evaluatePreflight(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
  process.exitCode = result.status === "blocked" ? 2 : 0;
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
  DEFAULT_SCENARIOS,
  classifyHostname,
  evaluatePreflight,
  parseArgs,
  parseTarget,
};
