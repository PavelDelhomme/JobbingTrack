#!/usr/bin/env node

/**
 * Vérifie que `/api/v1/persistence/stats` reflète bien les tables persistées
 * utilisées par `/backoffice/statistics/log-stats`.
 */

const http = require("node:http");
const { execFileSync } = require("node:child_process");

const METRICS_URL = process.env.METRICS_URL || "http://127.0.0.1:5004";

const REQUIRED_ACTIVE_COUNTS = [
  "aggregatedLogs",
  "logCollectorLogs",
  "systemMetrics",
  "containerMetrics",
  "containerLogs",
  "serviceAvailability",
  "securityMetrics",
  "events",
  "serviceNetwork",
];

function runDockerCompose(args) {
  return execFileSync("docker", ["compose", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, COMPOSE_PROFILES: process.env.COMPOSE_PROFILES || "full" },
  });
}

function readMetricsApiKey() {
  if (process.env.METRICS_API_KEY) return process.env.METRICS_API_KEY;
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "jobbingtrack-metrics-aggregator",
        "sh",
        "-lc",
        'printf %s "$METRICS_API_KEY"',
      ],
      { encoding: "utf8" },
    ).trim();
  } catch {
    return runDockerCompose([
      "exec",
      "jobbingtrack-metrics-aggregator",
      "sh",
      "-lc",
      'printf %s "$METRICS_API_KEY"',
    ]).trim();
  }
}

function getJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error("Timeout persistence stats"));
    });
  });
}

async function main() {
  const apiKey = readMetricsApiKey();
  if (!apiKey) {
    throw new Error("METRICS_API_KEY introuvable");
  }

  const payload = await getJson(`${METRICS_URL}/api/v1/persistence/stats`, {
    "X-API-Key": apiKey,
  });
  const counts = payload?.data?.counts || {};
  const failures = [];

  for (const key of REQUIRED_ACTIVE_COUNTS) {
    const value = Number(counts[key] || 0);
    console.log(`${key}: ${value}`);
    if (value <= 0) failures.push(`${key}=0`);
  }

  const total = Number(counts.total || 0);
  console.log(`total: ${total}`);
  if (total <= 0) failures.push("total=0");

  const range = payload?.data?.dataRange || {};
  console.log(`range: ${range.oldest || "-"} -> ${range.newest || "-"}`);

  if (failures.length > 0) {
    console.error(`Persistence stats smoke failed: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("Persistence stats smoke OK.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
