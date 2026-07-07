#!/usr/bin/env node
/**
 * Smoke OTA releases — API gateway (sans make).
 * Usage: node scripts/mobile/smoke/api/smoke-mobile-releases-ota-api.js
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

const ROOT = path.join(__dirname, "../../../..");
const { loadRootEnv, loginAdminToken, requestJson } = require(
  path.join(ROOT, "scripts/ops/load-root-env.cjs"),
);

function multipartUpload(url, token, fields, filePath) {
  const boundary = `----jt-ota-${Date.now()}`;
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
    );
  }
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="apk"; filename="${fileName}"\r\nContent-Type: application/vnd.android.package-archive\r\n\r\n`,
  );

  const preamble = Buffer.from(parts.join(""), "utf8");
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([preamble, fileBuffer, closing]);

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      parsed,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
        timeout: 60000,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            reject(new Error(`Upload JSON invalide HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }
          resolve({ status: res.statusCode, data });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const env = loadRootEnv(ROOT);
  const port = env.API_GATEWAY_PORT || "5002";
  const apiBase = `http://127.0.0.1:${port}`;
  const { token } = await loginAdminToken(ROOT);

  console.log("[1/6] GET /admin/mobile/releases");
  const list = await requestJson(`${apiBase}/api/v1/admin/mobile/releases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (list.status !== 200 || !list.data?.success) {
    throw new Error(`List releases échoué HTTP ${list.status}`);
  }
  if (!list.data.data.deployHints) {
    throw new Error("deployHints absent — redémarrer api-gateway");
  }
  console.log("  deployHints.build", list.data.data.deployHints.suggestedBuild);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jt-ota-"));
  const apkPath = path.join(tmpDir, "smoke-debug.apk");
  fs.writeFileSync(apkPath, Buffer.from("PK\x03\x04smoke ota apk"));

  const build = String(list.data.data.deployHints.suggestedBuild);
  console.log("[2/6] POST upload canal dev build", build);
  const upload = await multipartUpload(
    `${apiBase}/api/v1/admin/mobile/releases/upload`,
    token,
    {
      version: list.data.data.deployHints.suggestedVersion || "1.0.0",
      buildNumber: build,
      channel: "dev",
      platform: "android",
      releaseNotes: "smoke-mobile-releases-ota-api",
    },
    apkPath,
  );
  if (upload.status !== 201 || !upload.data?.success) {
    throw new Error(`Upload échoué HTTP ${upload.status}: ${JSON.stringify(upload.data)}`);
  }
  const filename = upload.data.release.filename;
  console.log("  filename", filename);

  console.log("[3/6] GET latest dev");
  const latestDev = await requestJson(
    `${apiBase}/api/v1/mobile/releases/latest?platform=android&channel=dev`,
  );
  if (latestDev.status !== 200 || latestDev.data?.release?.buildNumber !== Number(build)) {
    throw new Error(`Latest dev incohérent: ${JSON.stringify(latestDev.data)}`);
  }

  console.log("[4/6] GET download");
  const dlStatus = await new Promise((resolve, reject) => {
    const url = `${apiBase}/api/v1/mobile/releases/download/${encodeURIComponent(filename)}`;
    http
      .get(url, { timeout: 30000 }, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on("error", reject);
  });
  if (dlStatus !== 200) {
    throw new Error(`Download APK HTTP ${dlStatus}`);
  }

  console.log("[5/6] POST promote dev → production");
  const promote = await requestJson(`${apiBase}/api/v1/admin/mobile/releases/promote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: "android",
      fromChannel: "dev",
      toChannel: "production",
    }),
  });
  if (promote.status !== 200 || !promote.data?.success) {
    throw new Error(`Promote échoué: ${JSON.stringify(promote.data)}`);
  }

  console.log("[6/6] GET latest production");
  const latestProd = await requestJson(
    `${apiBase}/api/v1/mobile/releases/latest?platform=android&channel=production`,
  );
  if (latestProd.status !== 200 || latestProd.data?.release?.buildNumber !== Number(build)) {
    throw new Error(`Latest prod incohérent: ${JSON.stringify(latestProd.data)}`);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("OK smoke-mobile-releases-ota-api — upload + OTA + promote");
  console.log("NOTE: smoke utilise un faux APK minimal — republiez un vrai APK via publish-built après smoke.");
}

main().catch((error) => {
  console.error("KO smoke-mobile-releases-ota-api:", error.message);
  process.exit(1);
});
