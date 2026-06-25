#!/usr/bin/env node
/**
 * Wrapper racine mobile — implémentation : scripts/mobile/setup/ensure-test-accounts-ready.js
 * Usage: node scripts/mobile/ensure-test-accounts-ready.js
 * Doc: scripts/mobile/README.md
 */
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(process.execPath, [path.join(__dirname, 'setup/ensure-test-accounts-ready.js'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
