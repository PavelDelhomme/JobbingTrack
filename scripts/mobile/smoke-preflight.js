#!/usr/bin/env node
/**
 * Wrapper racine mobile — implémentation : scripts/mobile/smoke/run/smoke-preflight.js
 * Usage: node scripts/mobile/smoke-preflight.js
 * Doc: scripts/mobile/README.md
 */
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, 'smoke/run/smoke-preflight.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
