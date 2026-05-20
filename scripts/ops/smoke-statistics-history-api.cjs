#!/usr/bin/env node

/**
 * Smoke API pour les graphes Statistics (taux d'erreur / disponibilité).
 * Vérifie que `/api/v1/persistence/system/metrics` renvoie des points exploitables.
 */

const http = require("node:http");
const { execFileSync } = require("node:child_process");

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

function getJson(path, headers) {
  return new Promise((resolve, reject) => {
    const url = `${METRICS_URL}${path}`;
    const req = http.get(url, { headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} ${path}: ${body.slice(0, 400)}`));
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
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Timeout ${path}`));
    });
  });
}

async function main() {
  const apiKey = readMetricsApiKey();
  if (!apiKey) throw new Error("METRICS_API_KEY introuvable");

  const headers = { "X-API-Key": apiKey };
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const qs = new URLSearchParams({
    limit: "50",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  const history = await getJson(
    `/api/v1/persistence/system/metrics?${qs.toString()}`,
    headers,
  );
  const points = Array.isArray(history.data) ? history.data : [];
  if (points.length === 0) {
    throw new Error("Aucun point system_metrics sur 7 jours");
  }

  const withAvailability = points.filter(
    (p) =>
      p.availabilityPercent != null ||
      p.availability_percent != null,
  ).length;
  const withExplicitError = points.filter(
    (p) => p.errorRate != null || p.error_rate != null,
  ).length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        points: points.length,
        withAvailability,
        withExplicitError,
        newest: points[0]?.timestamp,
      },
      null,
      2,
    ),
  );

  if (withAvailability === 0 && withExplicitError === 0) {
    throw new Error(
      "Points présents mais sans availability ni error_rate — graphes vides côté UI",
    );
  }
}

main().catch((error) => {
  console.error("[smoke-statistics-history-api]", error.message);
  process.exit(1);
});
