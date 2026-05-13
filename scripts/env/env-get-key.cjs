#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const key = process.argv[2];
if (!key || !/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
  process.exit(1);
}

if (process.env[key]) {
  process.stdout.write(process.env[key]);
  process.exit(0);
}

const envPath = process.env.ENV_FILE || path.resolve(__dirname, '../..', '.env');
if (!fs.existsSync(envPath)) {
  process.exit(0);
}

const line = fs.readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .find((entry) => {
    const trimmed = entry.trimStart();
    return trimmed && !trimmed.startsWith('#') && trimmed.startsWith(`${key}=`);
  });

if (!line) {
  process.exit(0);
}

const value = line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
process.stdout.write(value);
