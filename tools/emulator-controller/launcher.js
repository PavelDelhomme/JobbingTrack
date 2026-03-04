#!/usr/bin/env node
/**
 * Lanceur du contrôleur d'émulateur : démarre/arrête le contrôleur (server.js)
 * et le redémarre automatiquement après un appel à POST /restart sur le contrôleur.
 * Écoute sur le port LAUNCHER_PORT (défaut 5056) pour POST /start et POST /stop.
 * Le contrôleur écoute sur 5055 (voir server.js).
 *
 * Usage : node launcher.js  (puis depuis le backoffice : Démarrer / Arrêter le contrôleur)
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const LAUNCHER_PORT = parseInt(process.env.EMULATOR_LAUNCHER_PORT || '5056', 10);
const CONTROLLER_PORT = process.env.EMULATOR_CONTROLLER_PORT || '5055';
const DIR = path.resolve(__dirname);

let child = null;
let autoRestart = true;

function send(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function startController() {
  if (child) return false;
  child = spawn('node', ['server.js'], {
    cwd: DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, EMULATOR_CONTROLLER_PORT: CONTROLLER_PORT },
  });
  child.stdout.on('data', (d) => process.stdout.write(d));
  child.stderr.on('data', (d) => process.stderr.write(d));
  child.on('exit', (code) => {
    child = null;
    if (autoRestart && code === 0) {
      console.log('[launcher] Contrôleur arrêté (restart demandé), redémarrage dans 2s...');
      setTimeout(startController, 2000);
    }
  });
  child.on('error', (e) => console.error('[launcher] Erreur enfant:', e.message));
  return true;
}

function stopController() {
  if (!child) return false;
  autoRestart = false;
  child.kill('SIGTERM');
  child = null;
  setTimeout(() => { autoRestart = true; }, 1000);
  return true;
}

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

  if (req.method === 'GET' && pathname === '/status') {
    return send(res, 200, { running: !!child, controllerPort: CONTROLLER_PORT, launcherPort: LAUNCHER_PORT });
  }

  if (req.method === 'POST' && pathname === '/start') {
    const started = startController();
    return send(res, 200, { success: true, started, message: started ? 'Contrôleur démarré (port ' + CONTROLLER_PORT + ').' : 'Contrôleur déjà en cours.' });
  }

  if (req.method === 'POST' && pathname === '/stop') {
    const stopped = stopController();
    return send(res, 200, { success: true, stopped, message: stopped ? 'Contrôleur arrêté.' : 'Contrôleur déjà arrêté.' });
  }

  send(res, 404, { error: 'Not found', routes: ['GET /status', 'POST /start', 'POST /stop'] });
});

server.listen(LAUNCHER_PORT, '0.0.0.0', () => {
  console.log('Lanceur contrôleur: http://0.0.0.0:' + LAUNCHER_PORT + ' (start/stop)');
  console.log('Démarrage du contrôleur sur le port ' + CONTROLLER_PORT + '...');
  startController();
});
