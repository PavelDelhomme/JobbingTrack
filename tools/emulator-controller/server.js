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
      await execCapture('flutter clean', { cwd: MOBILE_PATH, env: baseEnv });
      const { stdout, stderr, code } = await execCapture('flutter build apk --debug', { cwd: MOBILE_PATH, env: baseEnv });
      const apkPath = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
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
      const apkPath = path.join(MOBILE_PATH, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
      if (!fs.existsSync(apkPath)) {
        return send(res, 400, { success: false, error: 'APK non trouvé. Lancez d\'abord "Build APK".' });
      }
      await execPromise(`adb -s ${deviceId} install -r "${apkPath}"`);
      await execPromise(`adb -s ${deviceId} shell am start -n com.jobbingtrack_mobile/.MainActivity`);
      send(res, 200, { success: true, message: 'App installée et lancée' });
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

  async '/health'(req, res) {
    send(res, 200, { ok: true, service: 'emulator-controller', mobilePath: MOBILE_PATH });
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
  const pathname = url.split('?')[0];
  let body = null;

  const next = () => {
    const handler = routes[pathname];
    if (!handler) {
      return send(res, 404, { error: 'Not found' });
    }
    if (req.method === 'POST' && (pathname === '/start-avd' || pathname === '/build-apk' || pathname === '/install-run' || pathname === '/run-flutter' || pathname === '/input-tap')) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Emulator controller: http://0.0.0.0:${PORT} (mobile: ${MOBILE_PATH})`);
});
