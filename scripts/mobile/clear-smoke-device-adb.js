#!/usr/bin/env node
/**
 * Wrapper racine mobile — implémentation : scripts/mobile/setup/clear-smoke-device-adb.js
 * Usage: node scripts/mobile/clear-smoke-device-adb.js
 * Doc: scripts/mobile/README.md
 */
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, 'setup/clear-smoke-device-adb.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
