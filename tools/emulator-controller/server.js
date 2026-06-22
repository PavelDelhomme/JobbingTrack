#!/usr/bin/env node
/**
 * Contrôleur d'émulateur Android – à lancer sur la machine hôte (avec Android SDK + Flutter).
 * Expose : liste AVD, liste appareils ADB, démarrer AVD, build APK, run app, screenshot.
 * Port par défaut : 5055 (plage 50XX du projet). CORS activé pour le backoffice.
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.EMULATOR_CONTROLLER_PORT || '5055', 10);
const HOST = process.env.EMULATOR_CONTROLLER_HOST || '127.0.0.1';
const BASE_PATH = (process.env.EMULATOR_CONTROLLER_BASE_PATH || '').replace(/\/$/, '');
const MOBILE_PATH = process.env.MOBILE_PROJECT_PATH || path.resolve(__dirname, '../../mobile');
let ANDROID_HOME = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
if (!ANDROID_HOME && process.env.HOME) {
  const p = path.join(process.env.HOME, 'Android', 'Sdk');
  if (fs.existsSync(p)) ANDROID_HOME = p;
}
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'com.example.jobbingtrack_mobile';

function envWithAndroid() {
  return { ...process.env, ANDROID_HOME, ANDROID_SDK_ROOT: ANDROID_HOME };
}

function send(res, statusCode, body, contentType = 'application/json') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function execPromise(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, env: envWithAndroid(), ...opts }, (err, stdout, stderr) => {
      if (err) {
        const msg = Buffer.isBuffer(stderr) ? stderr.toString() : (stderr || stdout || err.message);
        return reject(new Error(typeof msg === 'string' ? msg : String(msg)));
      }
      const encoding = opts.encoding;
      if (encoding === null) {
        resolve({ stdout, stderr: (Buffer.isBuffer(stderr) ? stderr.toString() : (stderr || '')).trim() });
        return;
      }
      const out = stdout == null ? '' : (Buffer.isBuffer(stdout) ? stdout.toString() : String(stdout));
      const serr = stderr == null ? '' : (Buffer.isBuffer(stderr) ? stderr.toString() : String(stderr));
      resolve({ stdout: out.trim(), stderr: serr.trim() });
    });
  });
}

/** Exécute une commande et retourne toujours { stdout, stderr, code } sans rejeter (pour build long). */
function execCapture(cmd, opts = {}) {
  return new Promise((resolve) => {
    const env = { ...envWithAndroid(), ...(opts.env || {}) };
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, env, ...opts }, (err, stdout, stderr) => {
      const out = stdout == null ? '' : (Buffer.isBuffer(stdout) ? stdout.toString() : String(stdout));
      const serr = stderr == null ? '' : (Buffer.isBuffer(stderr) ? stderr.toString() : String(stderr));
      resolve({
        stdout: out.trim(),
        stderr: serr.trim(),
        code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
      });
    });
  });
}

function parseAdbDevices(stdout) {
  const lines = stdout.split('\n').filter((l) => l.trim() && !l.startsWith('List'));
  return lines.map((line) => {
    const [id, ...rest] = line.split(/\s+/);
    return { id, status: rest.join(' ') || 'device' };
  });
}

/** Lit le chemin du SDK Flutter depuis mobile/android/local.properties */
function getFlutterSdkPath() {
  const propsPath = path.join(MOBILE_PATH, 'android', 'local.properties');
  if (!fs.existsSync(propsPath)) return null;
  try {
    const content = fs.readFileSync(propsPath, 'utf8');
    const m = content.match(/flutter\.sdk=(.+)/);
    return m ? m[1].trim() : null;
  } catch (_) {
    return null;
  }
}

/** Copie récursive d'un dossier (Node 16+ fs.cpSync, sinon fallback). */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
  return true;
}

/** Assure qu'une copie writable de flutter_tools/gradle existe et retourne son chemin (pour SDK en lecture seule). */
function ensureWritableFlutterGradle() {
  const flutterSdk = getFlutterSdkPath();
  if (!flutterSdk) return null;
  const sourceGradle = path.join(flutterSdk, 'packages', 'flutter_tools', 'gradle');
  if (!fs.existsSync(sourceGradle)) return null;
  const cacheDir = path.join(MOBILE_PATH, '.flutter-gradle-cache');
  const gradleCache = path.join(cacheDir, 'gradle');
  if (!fs.existsSync(gradleCache)) {
    try {
      copyDirRecursive(sourceGradle, gradleCache);
    } catch (e) {
      console.error('Copy flutter gradle failed:', e.message);
      return null;
    }
  }
  return gradleCache;
}

/** Exécute uiautomator dump avec timeout et 2 tentatives (évite échec après redémarrage app). */
async function uiaDumpWithRetry(deviceId, timeoutMs = 25000) {
  const fast = ['1', 'true', 'yes'].includes(String(process.env.ADB_FAST || '').toLowerCase());
  const effectiveTimeout = fast ? Math.min(timeoutMs, 12000) : timeoutMs;
  const deviceArg = deviceId ? `-s ${deviceId}` : '';
  const dumpCmd = `adb ${deviceArg} shell uiautomator dump /sdcard/ui_dump.xml`;
  const catCmd = `adb ${deviceArg} shell cat /sdcard/ui_dump.xml`;
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await execPromise(dumpCmd, { timeout: effectiveTimeout });
      const { stdout } = await execPromise(catCmd, { timeout: 10000 });
      return stdout || '';
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise(r => setTimeout(r, 700));
    }
  }
  throw lastErr;
}

/** Retourne la date de modification la plus récente des fichiers sous dir (récursif), ou 0 si absent. */
function getNewestMtime(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return 0;
  let max = 0;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const sub = getNewestMtime(full);
      if (sub > max) max = sub;
    } else {
      const m = stat.mtimeMs;
      if (m > max) max = m;
    }
  }
  return max;
}

const routes = {
  async '/avds'(req, res) {
    try {
      const emulatorPath = ANDROID_HOME ? path.join(ANDROID_HOME, 'emulator', 'emulator') : 'emulator';
      const { stdout } = await execPromise(`${emulatorPath} -list-avds`);
      const avds = stdout ? stdout.split('\n').filter(Boolean).map((name) => ({ name })) : [];
      send(res, 200, { success: true, avds });
    } catch (e) {
      send(res, 200, { success: true, avds: [], error: e.message });
    }
  },

  async '/devices'(req, res) {
    try {
      const { stdout } = await execPromise('adb devices');
      const devices = parseAdbDevices(stdout);
      send(res, 200, { success: true, devices });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  async '/start-avd'(req, res, body) {
    let avd;
    try {
      avd = body && body.avd;
      if (!avd) {
        return send(res, 400, { success: false, error: 'Body { "avd": "nom_avd" } requis' });
      }
      const emulatorPath = ANDROID_HOME ? path.join(ANDROID_HOME, 'emulator', 'emulator') : 'emulator';
      spawn(emulatorPath, ['-avd', avd], { detached: true, stdio: 'ignore' }).unref();
      send(res, 200, { success: true, message: `Démarrage AVD: ${avd}` });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  async '/build-apk'(req, res) {
    try {
      if (!fs.existsSync(path.join(MOBILE_PATH, 'pubspec.yaml'))) {
        return send(res, 400, { success: false, error: `Projet Flutter introuvable: ${MOBILE_PATH}` });
      }
      const baseEnv = envWithAndroid();
      const gradleCache = ensureWritableFlutterGradle();
      if (gradleCache) baseEnv.FLUTTER_GRADLE_BUILD_PATH = gradleCache;

      // 1) Supprimer tout le dossier outputs (et build/app si besoin) pour éviter "Zip already contains entry ... cannot overwrite"
      const outputsDir = path.join(MOBILE_PATH, 'build', 'app', 'outputs');
      const buildAppDir = path.join(MOBILE_PATH, 'build', 'app');
      try {
        if (fs.existsSync(outputsDir)) fs.rmSync(outputsDir, { recursive: true, force: true });
        // Au cas où outputs a échoué : supprimer les dossiers apk et flutter-apk un par un
        const apkDir = path.join(buildAppDir, 'outputs', 'apk');
        const flutterApkDir = path.join(buildAppDir, 'outputs', 'flutter-apk');
        if (fs.existsSync(apkDir)) fs.rmSync(apkDir, { recursive: true, force: true });
        if (fs.existsSync(flutterApkDir)) fs.rmSync(flutterApkDir, { recursive: true, force: true });
      } catch (_) { /* ignore */ }

      // 2) flutter clean (vide le cache build Flutter)
      await execCapture('flutter clean', { cwd: MOBILE_PATH, env: baseEnv });

      // 3) Re-supprimer outputs après clean au cas où clean aurait recréé un dossier
      try {
        if (fs.existsSync(outputsDir)) fs.rmSync(outputsDir, { recursive: true, force: true });
      } catch (_) { /* ignore */ }

      const { stdout, stderr, code } = await execCapture('flutter build apk --debug', { cwd: MOBILE_PATH, env: baseEnv });
      const apkPathFlutter = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
      const apkPathLegacy = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'apk', 'debug', 'app-debug.apk');
      const apkPath = fs.existsSync(apkPathFlutter) ? apkPathFlutter : apkPathLegacy;
      const exists = fs.existsSync(apkPath);
      const ok = exists && code === 0;
      const stdoutStr = typeof stdout === 'string' ? stdout : String(stdout || '');
      const stderrStr = typeof stderr === 'string' ? stderr : String(stderr || '');
      return send(res, 200, {
        success: !!ok,
        message: ok ? 'Build APK réussi' : (exists ? 'Build terminé avec erreur (voir stderr)' : 'Build échoué (voir stderr)'),
        path: exists ? apkPath : null,
        exitCode: code,
        stdout: stdoutStr.slice(-4000),
        stderr: stderrStr.slice(-2000),
      });
    } catch (e) {
      return send(res, 200, { success: false, error: (e && e.message) || String(e), stderr: '' });
    }
  },

  async '/install-run'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "emulator-5554" } requis' });
      }
      const apkPathFlutter = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
      const apkPathLegacy = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'apk', 'debug', 'app-debug.apk');
      const apkPath = fs.existsSync(apkPathFlutter) ? apkPathFlutter : (fs.existsSync(apkPathLegacy) ? apkPathLegacy : null);
      if (!apkPath || !fs.existsSync(apkPath)) {
        return send(res, 400, { success: false, error: 'APK non trouvé. Lancez d\'abord "Build APK".' });
      }
      const execOpts = { cwd: MOBILE_PATH };
      // Rediriger les ports du PC vers le téléphone pour que localhost fonctionne sur l'appareil
      const portsToReverse = [5002, 5003, 3000, 3001, 3002, 3003, 3004, 3005, 8025];
      for (const port of portsToReverse) {
        try {
          await execPromise(`adb -s ${deviceId} reverse tcp:${port} tcp:${port}`, execOpts);
        } catch (_) { /* ignore si adb reverse échoue */ }
      }
      await execPromise(`adb -s ${deviceId} install -r "${apkPath}"`, execOpts);
      await execPromise(`adb -s ${deviceId} shell am force-stop ${ANDROID_PACKAGE}`, execOpts);
      await execPromise(`adb -s ${deviceId} shell am start -n ${ANDROID_PACKAGE}/.MainActivity`, execOpts);
      send(res, 200, { success: true, message: 'App installée, fermée puis relancée (adb reverse activé sur ports API)' });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  /** Arrête l'app (force-stop) sans la relancer. Utile après un build APK pour réactiver "Installer et lancer". */
  async '/stop-app'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "emulator-5554" } requis' });
      }
      await execPromise(`adb -s ${deviceId} shell am force-stop ${ANDROID_PACKAGE}`, { cwd: MOBILE_PATH });
      send(res, 200, { success: true, message: 'App arrêtée (force-stop)' });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  /** Désinstalle l'app du périphérique (adb uninstall). Permet une réinstallation propre. */
  async '/uninstall-app'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "emulator-5554" } requis' });
      }
      const execOpts = { cwd: MOBILE_PATH };
      await execPromise(`adb -s ${deviceId} uninstall ${ANDROID_PACKAGE}`, execOpts);
      send(res, 200, { success: true, message: 'App désinstallée du périphérique' });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  /** Redémarre le processus du contrôleur (pour charger la dernière version du code). Le client doit relancer make emulator-controller. */
  async '/restart'(req, res, _body, _url) {
    send(res, 200, { success: true, message: 'Redémarrage du contrôleur dans 1s. Relancez : make emulator-controller' });
    setTimeout(() => process.exit(0), 1000);
  },

  /** Ferme l'app (force-stop) puis la relance sans réinstaller. Délai avant retour pour laisser uiautomator prêt. */
  async '/force-restart-app'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "emulator-5554" } requis' });
      }
      const execOpts = { cwd: MOBILE_PATH };
      await execPromise(`adb -s ${deviceId} shell am force-stop ${ANDROID_PACKAGE}`, execOpts);
      await new Promise(r => setTimeout(r, 800));
      await execPromise(`adb -s ${deviceId} shell am start -n ${ANDROID_PACKAGE}/.MainActivity`, execOpts);
      // Délai pour que l'app et uiautomator soient prêts (évite "uiauto machine failed")
      await new Promise(r => setTimeout(r, 5500));
      send(res, 200, { success: true, message: 'App fermée puis relancée' });
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  async '/run-flutter'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "..." } requis' });
      }
      const child = spawn('flutter', ['run', '-d', deviceId, '--no-pub'], {
        cwd: MOBILE_PATH,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: envWithAndroid(),
        detached: true,
      });
      child.unref();
      child.stdout.on('data', (d) => process.stdout.write(d));
      child.stderr.on('data', (d) => process.stderr.write(d));
      child.on('error', (e) => console.error('flutter run error:', e.message));
      send(res, 200, { success: true, message: 'Flutter run démarré. Logs dans le terminal du contrôleur.' });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/flutter-devices'(req, res) {
    try {
      const { stdout } = await execPromise('flutter devices --machine', { cwd: MOBILE_PATH });
      let devices = [];
      try {
        const trimmed = stdout.trim();
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        devices = arr.map((o) => ({ id: o.id, name: o.name || o.id, platform: o.platformType || o.platform }));
      } catch (_) {
        const lines = stdout.trim().split('\n').filter(Boolean);
        devices = lines.map((line) => {
          try {
            const o = JSON.parse(line);
            return { id: o.id, name: o.name || o.id, platform: o.platformType || o.platform };
          } catch (e2) {
            return null;
          }
        }).filter(Boolean);
      }
      send(res, 200, { success: true, devices });
    } catch (e) {
      send(res, 200, { success: true, devices: [], error: (e && e.message) || String(e) });
    }
  },

  async '/input-tap'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const x = body && typeof body.x === 'number' ? Math.round(body.x) : null;
      const y = body && typeof body.y === 'number' ? Math.round(body.y) : null;
      if (!deviceId || x == null || y == null || x < 0 || y < 0) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "...", "x": number, "y": number } requis' });
      }
      await execPromise(`adb -s ${deviceId} shell input tap ${x} ${y}`);
      send(res, 200, { success: true, message: `Tap (${x}, ${y})` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/input-text'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const text = body && body.text;
      if (!deviceId || typeof text !== 'string') {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "...", "text": "..." } requis' });
      }
      const escaped = text.replace(/ /g, '%s').replace(/[&|;<>()$`\\!"']/g, (c) => `\\${c}`);
      await execPromise(`adb -s ${deviceId} shell input text "${escaped}"`);
      send(res, 200, { success: true, message: `Text: ${text.slice(0, 30)}` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/input-keyevent'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const keycode = body && body.keycode;
      if (!deviceId || keycode == null) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "...", "keycode": 4 } requis (4=BACK, 3=HOME, 66=ENTER, 67=DEL, 61=TAB)' });
      }
      await execPromise(`adb -s ${deviceId} shell input keyevent ${keycode}`);
      send(res, 200, { success: true, message: `Keyevent: ${keycode}` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/input-swipe'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const { x1, y1, x2, y2, duration } = body || {};
      if (!deviceId || x1 == null || y1 == null || x2 == null || y2 == null) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "...", "x1", "y1", "x2", "y2", "duration"? } requis' });
      }
      const dur = duration || 300;
      await execPromise(`adb -s ${deviceId} shell input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${dur}`);
      send(res, 200, { success: true, message: `Swipe (${x1},${y1})->(${x2},${y2})` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/clear-field'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const length = (body && body.length) || 50;
      if (!deviceId) {
        return send(res, 400, { success: false, error: 'Body { "deviceId": "...", "length"?: 50 } requis' });
      }
      for (let i = 0; i < length; i++) {
        await execPromise(`adb -s ${deviceId} shell input keyevent 67`);
      }
      send(res, 200, { success: true, message: `Cleared ${length} chars` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/ui-dump'(req, res, body) {
    try {
      const deviceId = (body && body.deviceId) || '';
      const xml = await uiaDumpWithRetry(deviceId);
      send(res, 200, { success: true, xml });
    } catch (e) {
      send(res, 200, { success: false, xml: '', error: (e && e.message) || String(e) });
    }
  },

  async '/find-and-tap'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const text = body && body.text;
      const contentDesc = body && body.contentDesc;
      const className = body && body.className;
      const index = (body && body.index) || 0;
      const preferClickable = body && body.preferClickable !== false;
      if (!deviceId || (!text && !contentDesc && !className)) {
        return send(res, 400, { success: false, error: 'Body { "deviceId", "text"? | "contentDesc"? | "className"?, "index"?: 0 } requis' });
      }
      const xml = await uiaDumpWithRetry(deviceId);

      const nodes = [];
      const nodeRegex = /<node[^>]*>/g;
      let match;
      while ((match = nodeRegex.exec(xml)) !== null) {
        const n = match[0];
        const getText = (attr) => { const m = n.match(new RegExp(`${attr}="([^"]*)"`)); return m ? m[1] : ''; };
        const clickable = /clickable="true"/.test(n);
        nodes.push({ text: getText('text'), contentDesc: getText('content-desc'), className: getText('class'), bounds: getText('bounds'), resourceId: getText('resource-id'), clickable });
      }

      const safe = (s) => (s == null || s === undefined ? '' : String(s));
      const matches = nodes.filter((n) => {
        if (text) {
          const t = text.toLowerCase();
          if (safe(n.text).toLowerCase().includes(t) || safe(n.contentDesc).toLowerCase().includes(t)) return true;
        }
        if (contentDesc && safe(n.contentDesc).toLowerCase().includes(String(contentDesc).toLowerCase())) return true;
        if (className && safe(n.className).includes(className)) return true;
        return false;
      });

      if (matches.length === 0) {
        return send(res, 200, { success: false, error: `Element not found: text="${text}" contentDesc="${contentDesc}"`, nodes: nodes.filter(n => n.text || n.contentDesc).slice(0, 30) });
      }

      let sorted = matches;
      if (preferClickable && matches.length > 1) {
        const clickableMatches = matches.filter(n => n.clickable);
        if (clickableMatches.length > 0) sorted = clickableMatches;
      }

      const target = sorted[Math.min(index, sorted.length - 1)];
      const boundsMatch = target.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!boundsMatch) {
        return send(res, 200, { success: false, error: `Cannot parse bounds: ${target.bounds}` });
      }
      const cx = Math.round((parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2);
      const cy = Math.round((parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2);

      await execPromise(`adb -s ${deviceId} shell input tap ${cx} ${cy}`);
      send(res, 200, { success: true, message: `Tapped "${target.text || target.contentDesc}" at (${cx}, ${cy})`, bounds: target.bounds, clickable: target.clickable });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/tap-field-and-type'(req, res, body) {
    try {
      const deviceId = body && body.deviceId;
      const hint = body && body.hint;
      const text = body && body.text;
      const index = Math.max(0, parseInt(body && body.index, 10) || 0);
      const editTextIndexRaw = body && body.editTextIndex;
      const hasEditTextIndex =
        editTextIndexRaw !== undefined && editTextIndexRaw !== null && editTextIndexRaw !== '';
      if (!deviceId || typeof text !== 'string' || (!hint && !hasEditTextIndex)) {
        return send(res, 400, {
          success: false,
          error: 'Body { "deviceId", "hint" ou "editTextIndex", "text": "value" } requis',
        });
      }
      const xml = await uiaDumpWithRetry(deviceId);
      const nodeRegex = /<node[^>]*>/g;
      const hintLower = hint ? String(hint).toLowerCase() : '';
      const matchStr = (attr) => attr && attr.toLowerCase().includes(hintLower);
      const editableTrue = (n) => /editable="true"/.test(n) || /class="[^"]*EditText[^"]*"/.test(n);
      const targets = [];
      const targetsEditable = [];
      const targetCurrentTexts = [];

      if (hasEditTextIndex) {
        const editIdx = Math.max(0, parseInt(editTextIndexRaw, 10) || 0);
        const editNodes = [];
        let mEdit;
        while ((mEdit = nodeRegex.exec(xml)) !== null) {
          const n = mEdit[0];
          if (!editableTrue(n)) continue;
          const boundsMatch = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
          if (!boundsMatch) continue;
          const t = (n.match(/text="([^"]*)"/) || [])[1];
          editNodes.push({ bounds: boundsMatch, text: (t || '').trim(), y: parseInt(boundsMatch[2], 10) });
        }
        editNodes.sort((a, b) => a.y - b.y);
        const picked = editNodes[editIdx];
        if (!picked) {
          return send(res, 200, {
            success: false,
            error: `EditText #${editIdx} introuvable (${editNodes.length} champ(s))`,
          });
        }
        targets.push(picked.bounds);
        targetCurrentTexts.push(picked.text);
        targetsEditable.push(picked.bounds);
      }

      let match;
      if (!hasEditTextIndex) {
        while ((match = nodeRegex.exec(xml)) !== null) {
        const n = match[0];
        const h = (n.match(/hint="([^"]*)"/) || [])[1];
        const t = (n.match(/text="([^"]*)"/) || [])[1];
        const c = (n.match(/content-desc="([^"]*)"/) || [])[1];
        const ok = matchStr(h) || matchStr(t) || matchStr(c);
        if (ok) {
          const boundsMatch = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
          if (boundsMatch) {
            const currentText = (t || '').trim();
            targets.push(boundsMatch);
            targetCurrentTexts.push(currentText);
            if (editableTrue(n)) targetsEditable.push(boundsMatch);
          }
        }
        }
      }
      const list = targetsEditable.length > 0 ? targetsEditable : targets;
      const target = list[index];
      if (!target) {
        const label = hasEditTextIndex ? `EditText #${editTextIndexRaw}` : `Field with hint/text "${hint}"`;
        return send(res, 200, {
          success: false,
          error: `${label} not found${targets.length ? ` (${targets.length} match(es), ${targetsEditable.length} editable, index ${index})` : ''}`,
        });
      }
      const targetIdxInAll = targets.indexOf(target);
      const currentFieldText = targetIdxInAll >= 0 && targetCurrentTexts[targetIdxInAll] !== undefined ? targetCurrentTexts[targetIdxInAll] : '';
      const cx = Math.round((parseInt(target[1]) + parseInt(target[3])) / 2);
      const cy = Math.round((parseInt(target[2]) + parseInt(target[4])) / 2);
      await execPromise(`adb -s ${deviceId} shell input tap ${cx} ${cy}`);
      let trimmed = typeof text === 'string' ? text.trim() : String(text).trim();
      const fast =
        (body && body.fast === true) ||
        ['1', 'true', 'yes'].includes(String(process.env.ADB_FAST || '').toLowerCase());
      const pause = (ms) =>
        new Promise((r) => setTimeout(r, fast ? Math.max(40, Math.round(ms * 0.25)) : ms));
      const isEmailField =
        body.isEmail === true ||
        (hint && String(hint).toLowerCase().includes('email')) ||
        trimmed.includes('@');
      if (isEmailField) console.log(`[tap-field-and-type] Champ email: valeur reçue="${trimmed}" longueur=${trimmed.length} fin="${trimmed.slice(-6)}"`);
      if (isEmailField) {
        await pause(600);
      } else {
        await pause(400);
      }
      await execPromise(`adb -s ${deviceId} shell input keyevent KEYCODE_MOVE_END`);
      const delCount = currentFieldText.length > 0 ? Math.min(120, currentFieldText.length + 15) : 0;
      for (let i = 0; i < delCount; i++) await execPromise(`adb -s ${deviceId} shell input keyevent 67`);
      await pause(150);
      if (isEmailField && /[0-9]$/.test(trimmed)) trimmed = trimmed.slice(0, -1);
      const esc = (s) => s.replace(/ /g, '%s').replace(/[&|;<>()$`\\!"'#]/g, (c) => `\\${c}`);
      const escaped = esc(trimmed);
      // Pour éviter que le clavier Android transforme ".com" en ".com6" ou ".me" en ".me6" : on tape les TLD caractère par caractère.
      const tldCom = trimmed.length >= 3 && trimmed.slice(-3) === 'com';
      const tldMe = trimmed.length >= 2 && trimmed.slice(-2) === 'me';
      if (isEmailField && tldCom) {
        const part1 = trimmed.slice(0, -3);
        const part1Esc = esc(part1);
        console.log(`[tap-field-and-type] Email .com: part1="${part1}" puis "com" caractère par caractère`);
        await execPromise(`adb -s ${deviceId} shell input text "${part1Esc}"`);
        await pause(550);
        for (const ch of 'com') {
          await execPromise(`adb -s ${deviceId} shell input text "${ch}"`);
          await pause(220);
        }
      } else if (isEmailField && tldMe) {
        const part1 = trimmed.slice(0, -2);
        const part1Esc = esc(part1);
        console.log(`[tap-field-and-type] Email .me: part1="${part1}" puis "me" caractère par caractère`);
        await execPromise(`adb -s ${deviceId} shell input text "${part1Esc}"`);
        await pause(450);
        for (const ch of 'me') {
          await execPromise(`adb -s ${deviceId} shell input text "${ch}"`);
          await pause(220);
        }
      } else {
        await execPromise(`adb -s ${deviceId} shell input text "${escaped}"`);
      }
      // Après saisie email : relire le champ (sauf mode rapide — dumps UI coûteux).
      if (isEmailField && !fast) {
        const emailAttempts = fast ? 2 : 4;
        for (let attempt = 0; attempt < emailAttempts; attempt++) {
          await pause(attempt === 0 ? 550 : 400);
          const xml2 = await uiaDumpWithRetry(deviceId);
          const nodeRegex2 = /<node[^>]*>/g;
          const texts2 = [];
          if (hasEditTextIndex) {
            const editIdx2 = Math.max(0, parseInt(editTextIndexRaw, 10) || 0);
            const editNodes2 = [];
            let mEdit2;
            while ((mEdit2 = nodeRegex2.exec(xml2)) !== null) {
              const n = mEdit2[0];
              if (!editableTrue(n)) continue;
              const boundsMatch = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
              if (!boundsMatch) continue;
              const t = (n.match(/text="([^"]*)"/) || [])[1];
              editNodes2.push({ text: (t || '').trim(), y: parseInt(boundsMatch[2], 10) });
            }
            editNodes2.sort((a, b) => a.y - b.y);
            if (editNodes2[editIdx2]) texts2.push(editNodes2[editIdx2].text);
          } else {
            let m2;
            while ((m2 = nodeRegex2.exec(xml2)) !== null) {
              const n = m2[0];
              const h = (n.match(/hint="([^"]*)"/) || [])[1];
              const t = (n.match(/text="([^"]*)"/) || [])[1];
              const ok = h && String(h).toLowerCase().includes(hintLower);
              if (ok && editableTrue(n)) texts2.push((t || '').trim());
            }
          }
          const idx = Math.min(index, texts2.length - 1);
          let currentText = idx >= 0 ? texts2[idx] : '';
          if (!currentText) break;
          if (currentText === trimmed) {
            if (attempt >= 2) break;
            continue;
          }
          const trailingDigits = (currentText.match(/[0-9]+$/) || [])[0];
          if (trailingDigits) {
            const nBack = trailingDigits.length;
            console.log(
              `[tap-field-and-type] Email: champ se termine par "${trailingDigits}", envoi de ${nBack} backspace(s)`,
            );
            for (let b = 0; b < nBack; b++) await execPromise(`adb -s ${deviceId} shell input keyevent 67`);
            currentText = currentText.slice(0, -nBack);
          }
          if (currentText && currentText !== trimmed && currentText.startsWith(trimmed)) {
            const nBack = currentText.length - trimmed.length;
            console.log(
              `[tap-field-and-type] Email: suffixe parasite "${currentText.slice(trimmed.length)}" → ${nBack} backspace(s)`,
            );
            for (let b = 0; b < nBack; b++) await execPromise(`adb -s ${deviceId} shell input keyevent 67`);
          }
        }
      }
      send(res, 200, { success: true, message: `Typed "${trimmed.slice(0, 30)}" in field "${hint}" at (${cx}, ${cy})` });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/screen-info'(req, res, body) {
    try {
      const deviceId = (body && body.deviceId) || '';
      const deviceArg = deviceId ? `-s ${deviceId}` : '';
      const { stdout } = await execPromise(`adb ${deviceArg} shell wm size`);
      const m = stdout.match(/(\d+)x(\d+)/);
      const width = m ? parseInt(m[1]) : 1080;
      const height = m ? parseInt(m[2]) : 1920;
      send(res, 200, { success: true, width, height });
    } catch (e) {
      send(res, 200, { success: false, width: 1080, height: 1920, error: (e && e.message) || String(e) });
    }
  },

  async '/screenshot'(req, res, _, url) {
    const u = new URL(url, 'http://x');
    const device = u.searchParams.get('device');
    if (!device) {
      return send(res, 400, { success: false, error: 'Query ?device=emulator-5554 requis' });
    }
    try {
      const { stdout } = await execPromise(`adb -s ${device} exec-out screencap -p`, { encoding: null });
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(stdout);
    } catch (e) {
      send(res, 500, { success: false, error: e.message });
    }
  },

  async '/adb-shell'(req, res, body) {
    try {
      const deviceId = (body && body.deviceId) || '';
      const command = (body && body.command) || '';
      if (!command) {
        return send(res, 400, { success: false, error: 'Body { "command": "am start ..." } requis' });
      }
      const deviceArg = deviceId ? `-s ${deviceId}` : '';
      const { stdout, stderr } = await execPromise(`adb ${deviceArg} shell ${command}`, { timeout: 15000 });
      send(res, 200, { success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    } catch (e) {
      send(res, 200, { success: false, error: (e && e.message) || String(e) });
    }
  },

  async '/health'(req, res) {
    send(res, 200, { ok: true, service: 'emulator-controller', mobilePath: MOBILE_PATH });
  },

  /** GET: indique si un build est nécessaire (APK plus ancien que mobile/lib). */
  async '/build-status'(req, res) {
    try {
      const apkPathFlutter = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
      const apkPathLegacy = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'apk', 'debug', 'app-debug.apk');
      const apkPath = fs.existsSync(apkPathFlutter) ? apkPathFlutter : (fs.existsSync(apkPathLegacy) ? apkPathLegacy : null);
      const apkMtime = apkPath && fs.existsSync(apkPath) ? fs.statSync(apkPath).mtimeMs : 0;
      const libDir = path.join(MOBILE_PATH, 'lib');
      const mobileLibMtime = getNewestMtime(libDir);
      const needsBuild = !apkPath || apkMtime < mobileLibMtime;
      send(res, 200, {
        needsBuild: !!needsBuild,
        apkPath: apkPath || null,
        apkMtime,
        mobileLibMtime,
      });
    } catch (e) {
      send(res, 200, { needsBuild: true, error: (e && e.message) || String(e) });
    }
  },

  /** Liste des routes enregistrées (GET) — pour vérifier que /stop-app est bien présent après redémarrage du contrôleur. */
  async '/routes'(req, res) {
    const list = Object.keys(routes).filter((k) => typeof routes[k] === 'function');
    send(res, 200, { routes: list, hasStopApp: list.includes('/stop-app') });
  },
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = req.url || '';
  const pathname = (url.split('?')[0] || '').replace(/\/$/, '') || '/';
  let body = null;

  const next = () => {
    const handler = routes[pathname];
    if (!handler) {
      return send(res, 404, { error: 'Not found' });
    }
    const postRoutes = ['/start-avd', '/build-apk', '/install-run', '/stop-app', '/uninstall-app', '/restart', '/force-restart-app', '/run-flutter', '/input-tap', '/input-text', '/input-keyevent', '/input-swipe', '/clear-field', '/ui-dump', '/find-and-tap', '/tap-field-and-type', '/screen-info', '/adb-shell'];
    if (req.method === 'POST' && postRoutes.includes(pathname)) {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try {
          body = data ? JSON.parse(data) : {};
        } catch (_) {
          body = {};
        }
        handler(req, res, body, url).catch((e) => send(res, 500, { success: false, error: e.message }));
      });
      return;
    }
    handler(req, res, body, url).catch((e) => send(res, 500, { success: false, error: e.message }));
  };

  if (req.method === 'GET' && pathname === '/screenshot') {
    return routes['/screenshot'](req, res, null, url).catch((e) => send(res, 500, { success: false, error: e.message }));
  }

  next();
});

server.listen(PORT, HOST, () => {
  console.log(`Emulator controller: http://${HOST}:${PORT} (mobile: ${MOBILE_PATH})`);
  if (HOST === '0.0.0.0') {
    console.warn('ATTENTION: écoute sur toutes interfaces — réservé au lab local, jamais en prod VPS.');
  }
});
