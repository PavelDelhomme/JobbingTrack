#!/usr/bin/env node
/**
 * Aperçu live écran Samsung/ADB dans le navigateur (sans scrcpy).
 * Usage : node scripts/mobile/setup/mobile-screen-browser.js
 * Ouvre http://127.0.0.1:8765 — screenshots via emulator-controller (5055).
 */
const http = require("http");
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const CONTROLLER =
  (process.env.EMULATOR_CONTROLLER_URL || "http://127.0.0.1:5055").replace(
    /\/$/,
    "",
  );
const PORT = parseInt(process.env.MOBILE_SCREEN_BROWSER_PORT || "8765", 10);
const REFRESH_MS = parseInt(process.env.MOBILE_SCREEN_REFRESH_MS || "600", 10);

function pickDevice() {
  if (process.env.ADB_DEVICE) return process.env.ADB_DEVICE.trim();
  try {
    const out = execSync("adb devices", { encoding: "utf8" });
    const line = out
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .find((l) => l.endsWith("\tdevice") || l.endsWith(" device"));
    if (!line) return null;
    return line.split(/\s+/)[0];
  } catch {
    return null;
  }
}

function controllerHealth() {
  return new Promise((resolve) => {
    http
      .get(`${CONTROLLER}/health`, (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => resolve(false));
  }).then(async (ok) => {
    if (ok) return true;
    console.log(
      "[mobile-screen-browser] Contrôleur absent — démarrage make emulator-controller-bg…",
    );
    try {
      spawn("make", ["emulator-controller-bg"], {
        cwd: ROOT,
        stdio: "ignore",
        detached: true,
      }).unref();
    } catch (_) {}
    for (let i = 0; i < 15; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const h = await new Promise((resolve) => {
        http
          .get(`${CONTROLLER}/health`, (res) => resolve(res.statusCode === 200))
          .on("error", () => resolve(false));
      });
      if (h) return true;
    }
    return false;
  });
}

function fetchScreenshot(device) {
  return new Promise((resolve, reject) => {
    const url = `${CONTROLLER}/screenshot?device=${encodeURIComponent(device)}&t=${Date.now()}`;
    http
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`screenshot HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function htmlPage(device) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>JobbingTrack — écran ${device}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #111; color: #eee; }
    header { padding: 10px 16px; background: #1f2937; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    header strong { color: #93c5fd; }
    #status { font-size: 13px; color: #9ca3af; }
    main { display: flex; justify-content: center; padding: 12px; min-height: calc(100vh - 52px); }
    img { max-height: 92vh; max-width: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.5); }
    .err { color: #fca5a5; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <strong>📱 Aperçu live ADB</strong>
    <span>Appareil : <code>${device}</code></span>
    <span id="status">Chargement…</span>
  </header>
  <main>
    <img id="screen" alt="Écran appareil" />
  </main>
  <script>
    const img = document.getElementById('screen');
    const status = document.getElementById('status');
    const interval = ${REFRESH_MS};
    let ok = 0;
    async function tick() {
      try {
        const r = await fetch('/screen.png?t=' + Date.now());
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const blob = await r.blob();
        img.src = URL.createObjectURL(blob);
        ok++;
        status.textContent = 'Actualisation ~' + interval + ' ms · frame ' + ok;
      } catch (e) {
        status.textContent = 'Erreur : ' + e.message;
      }
    }
    tick();
    setInterval(tick, interval);
  </script>
</body>
</html>`;
}

async function main() {
  const device = pickDevice();
  if (!device) {
    console.error("KO — aucun appareil ADB (adb devices → device)");
    process.exit(1);
  }

  const healthy = await controllerHealth();
  if (!healthy) {
    console.error(
      "KO — emulator-controller injoignable sur",
      CONTROLLER,
      "→ make emulator-controller-bg",
    );
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    if (req.url === "/" || req.url.startsWith("/?")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlPage(device));
      return;
    }
    if (req.url.startsWith("/screen.png")) {
      try {
        const png = await fetchScreenshot(device);
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "no-store",
        });
        res.end(png);
      } catch (e) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end(String(e.message));
      }
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(PORT, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${PORT}/`;
    console.log(`OK — Aperçu live : ${url}`);
    console.log(`   Appareil : ${device} · contrôleur : ${CONTROLLER}`);
    console.log("   Ctrl+C pour arrêter");
    try {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    } catch (_) {}
  });
}

main().catch((e) => {
  console.error("KO", e.message);
  process.exit(1);
});
