#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const http = require("node:http");

const METRICS_URL = (process.env.METRICS_URL || "http://127.0.0.1:5004").replace(
  /\/$/,
  "",
);

function readMetricsApiKey() {
  if (process.env.METRICS_API_KEY) return process.env.METRICS_API_KEY;
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
}

function requestJson(path, headers) {
  return new Promise((resolve, reject) => {
    const url = `${METRICS_URL}${path}`;
    const req = http.get(url, { headers, timeout: 30000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        let data;
        try {
          data = JSON.parse(body);
        } catch (error) {
          reject(new Error(`HTTP ${res.statusCode} JSON invalide (${path}): ${body.slice(0, 300)}`));
          return;
        }
        resolve({ status: res.statusCode, data, path });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`Timeout ${path}`)));
  });
}

async function main() {
  const apiKey = readMetricsApiKey();
  if (!apiKey) throw new Error("METRICS_API_KEY introuvable");

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const headers = {
    "X-API-Key": apiKey,
    "User-Agent": "JobbingTrack-statistics-log-stats-validation",
  };

  const paths = [
    "/api/v1/persistence/stats",
    `/api/v1/persistence/logs?limit=800&startDate=${since}`,
    `/api/v1/persistence/logs?limit=50&level=WARN&startDate=${since}`,
    `/api/v1/persistence/logs?limit=50&serviceName=jobbingtrack-api-gateway&startDate=${since}`,
  ];

  const results = [];
  for (const path of paths) {
    const { status, data } = await requestJson(path, headers);
    const item = {
      path: path.split("?")[0],
      query: path.includes("?") ? path.split("?", 2)[1] : "",
      status,
      success: Boolean(data.success ?? true),
      count: data.count,
    };
    if (path.endsWith("/stats")) {
      const counts = data.data?.counts || {};
      item.aggregatedLogs = counts.aggregatedLogs;
      item.logCollectorLogs = counts.logCollectorLogs;
      item.containerLogs = counts.containerLogs;
    }
    results.push(item);
  }

  process.stdout.write(`${JSON.stringify({ success: true, endpoints: results }, null, 2)}\n`);
}

main().catch((error) => {
  console.error("[smoke-statistics-log-stats-api]", error.message);
  process.exit(1);
});
