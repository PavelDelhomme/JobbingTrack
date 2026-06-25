#!/usr/bin/env node
/**
 * Wrapper racine mobile — implémentation : scripts/mobile/smoke/run/smoke-run-mobile-fast.js
 * Usage: node scripts/mobile/smoke-run-mobile-fast.js
 * Doc: scripts/mobile/README.md
 */
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, 'smoke/run/smoke-run-mobile-fast.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
