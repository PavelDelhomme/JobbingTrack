#!/usr/bin/env node

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

function loadRootEnv(rootDir = path.join(__dirname, "../..")) {
  const env = {};
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return env;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      parsed,
      {
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 60000,
      },
      (res) => {
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
            reject(
              new Error(
                `HTTP ${res.statusCode} JSON invalide (${parsed.pathname}): ${body.slice(0, 300)}`,
              ),
            );
            return;
          }
          resolve({ status: res.statusCode, data });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`Timeout ${parsed.pathname}`));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function loginAdminToken(rootDir = path.join(__dirname, "../..")) {
  const env = loadRootEnv(rootDir);
  const port = env.API_GATEWAY_PORT || "5002";
  const apiBase = `http://127.0.0.1:${port}`;
  const email = env.ADMIN_EMAIL || env.TEST_ADMIN_EMAIL || "admin@jobbingtrack.test";
  const password =
    env.ADMIN_PASSWORD || env.TEST_ADMIN_PASSWORD || "password123";

  const { status, data } = await requestJson(`${apiBase}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    timeout: 30000,
  });

  if (status !== 200) {
    throw new Error(
      `Login admin HTTP ${status}: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }

  const token = data.token || data.data?.token;
  if (!token) throw new Error("JWT admin introuvable après login");

  return { token, apiBase, email };
}

module.exports = {
  loadRootEnv,
  requestJson,
  loginAdminToken,
};
