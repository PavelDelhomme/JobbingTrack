/**
 * Verrou fichier — un seul smoke ADB à la fois par appareil.
 * @used-by scripts/mobile/smoke/run/smoke-preflight.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function lockPath(deviceId) {
  const safe = String(deviceId || 'default').replace(/[^\w.-]/g, '_');
  return path.join(os.tmpdir(), `jobbingtrack-smoke-${safe}.lock`);
}

function readLock(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    const [pid, startedAt, cmd] = raw.split('|');
    return { pid: Number(pid), startedAt, cmd: cmd || '', file };
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!pid || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireSmokeLock(deviceId, label = 'smoke') {
  const file = lockPath(deviceId);
  const existing = readLock(file);
  if (existing && isPidAlive(existing.pid) && existing.pid !== process.pid) {
    throw new Error(
      `Smoke déjà en cours (PID ${existing.pid}, depuis ${existing.startedAt}) — ${existing.cmd || 'autre script'}. Attendez la fin ou supprimez ${file}`,
    );
  }
  const payload = `${process.pid}|${new Date().toISOString()}|${label}`;
  fs.writeFileSync(file, payload, 'utf8');
  const release = () => {
    try {
      const cur = readLock(file);
      if (cur && cur.pid === process.pid) fs.unlinkSync(file);
    } catch {
      /* ok */
    }
  };
  process.on('exit', release);
  process.on('SIGINT', () => {
    release();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    release();
    process.exit(143);
  });
  return { file, release };
}

module.exports = { acquireSmokeLock, lockPath, readLock };
