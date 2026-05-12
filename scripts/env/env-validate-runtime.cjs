#!/usr/bin/env node
/**
 * Validation de configuration runtime sans afficher les valeurs sensibles.
 *
 * Objectif :
 * - vérifier que les clés critiques existent ;
 * - signaler les placeholders / secrets faibles ;
 * - rendre la prod stricte sans casser le dev local.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');
const PRODUCTION_EXAMPLE_PATH = path.join(ROOT, '.env.production.example');

const SECRET_NAME_PATTERN = /(PASSWORD|PASS|SECRET|TOKEN|KEY|API_KEY)/i;
const DEV_WEAK_CHECK_KEYS = new Set([
  'ADMIN_PASSWORD',
  'JWT_REFRESH_SECRET',
  'JWT_SECRET',
  'DEV_AUTH_BYPASS_TOKEN',
  'SECURITY_INTERNAL_SECRET',
  'METRICS_API_KEY',
  'POSTGRES_PASSWORD',
  'SMTP_PASS',
  'TEST_ADMIN_PASSWORD',
  'TEST_USER_PASSWORD',
  'NEXT_PUBLIC_MOBILE_TEST_USER_PASSWORD'
]);
const PROD_WEAK_CHECK_KEYS = new Set([
  'ADMIN_PASSWORD',
  'JWT_REFRESH_SECRET',
  'JWT_SECRET',
  'SECURITY_INTERNAL_SECRET',
  'METRICS_API_KEY',
  'POSTGRES_PASSWORD',
  'SMTP_PASS'
]);
const WEAK_VALUE_PATTERNS = [
  /^$/,
  /change-?me/i,
  /your-.*(secret|key|password|token)/i,
  /password123/i,
  /test-secret/i,
  /dev-only/i,
  /jobbingtrack-(internal-security-dev|metrics-secret-key)/i
];

function parseEnv(filePath) {
  const values = new Map();
  if (!fs.existsSync(filePath)) return values;

  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const line = trimmed.replace(/^export\s+/i, '');
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      values.set(key, value);
    }
  }

  return values;
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function hasWeakValue(value) {
  return WEAK_VALUE_PATTERNS.some((pattern) => pattern.test(String(value || '')));
}

function hasAny(values, keys) {
  return keys.some((key) => values.has(key) && String(values.get(key) || '').trim() !== '');
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const fileArgIndex = args.indexOf('--file');
  const envFile = fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? path.resolve(ROOT, args[fileArgIndex + 1])
    : process.env.ENV_FILE
      ? path.resolve(ROOT, process.env.ENV_FILE)
      : args.includes('--production-example')
        ? PRODUCTION_EXAMPLE_PATH
        : args.includes('--example')
          ? EXAMPLE_PATH
          : ENV_PATH;
  const values = parseEnv(envFile);
  const nodeEnv = values.get('NODE_ENV') || process.env.NODE_ENV || 'development';
  const productionLike = strict || nodeEnv === 'production' || args.includes('--production');
  const allowPlaceholders = args.includes('--allow-placeholders') || args.includes('--production-example');

  const errors = [];
  const warnings = [];

  if (!fs.existsSync(envFile)) {
    errors.push(`Fichier introuvable: ${path.relative(ROOT, envFile)}`);
  }

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SECURITY_INTERNAL_SECRET',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'ALLOWED_ORIGINS'
  ];

  for (const key of required) {
    if (!values.has(key) || String(values.get(key) || '').trim() === '') {
      errors.push(`${key} est requis et ne doit pas être vide`);
    }
  }

  if (isTruthy(values.get('SECURITY_ALERT_EMAIL_ENABLED')) || hasAny(values, ['SECURITY_ALERT_EMAIL', 'SECURITY_ALERT_EMAILS'])) {
    for (const key of ['NOTIFICATION_SERVICE_URL', 'SECURITY_INTERNAL_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) {
      if (!values.has(key) || String(values.get(key) || '').trim() === '') {
        errors.push(`${key} est requis pour les alertes email activées`);
      }
    }
  }

  for (const [key, value] of values.entries()) {
    if (key.startsWith('NEXT_PUBLIC_') && SECRET_NAME_PATTERN.test(key)) {
      const message = `${key} expose une valeur sensible potentielle côté navigateur`;
      if (productionLike) errors.push(message);
      else warnings.push(message);
    }

    const weakCheckKeys = productionLike ? PROD_WEAK_CHECK_KEYS : DEV_WEAK_CHECK_KEYS;
    if (!allowPlaceholders && weakCheckKeys.has(key) && hasWeakValue(value)) {
      const message = `${key} ressemble à une valeur faible, vide ou placeholder`;
      if (productionLike) errors.push(message);
      else warnings.push(message);
    }
  }

  const allowedOrigins = String(values.get('ALLOWED_ORIGINS') || '');
  if (productionLike) {
    const origins = allowedOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
    const invalidOrigin = origins.find((origin) =>
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('*') ||
      !origin.startsWith('https://')
    );
    if (origins.length === 0 || invalidOrigin) {
      errors.push('ALLOWED_ORIGINS doit contenir uniquement des origines https:// publiques en production');
    }
    if (String(values.get('WAF_ENABLED') || '').toLowerCase() === 'false') {
      errors.push('WAF_ENABLED=false interdit en production');
    }
    if (!isTruthy(values.get('ENABLE_METRICS_AUTH'))) {
      errors.push('ENABLE_METRICS_AUTH=true requis en production');
    }
    if (String(values.get('DEV_AUTH_BYPASS_TOKEN') || '').trim() !== '') {
      errors.push('DEV_AUTH_BYPASS_TOKEN doit être vide ou absent en production');
    }
  }

  console.log('══════════════════════════════════════════════════════════');
  console.log('  Validation runtime .env');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Fichier : ${path.relative(ROOT, envFile)}`);
  console.log(`  Mode    : ${productionLike ? 'strict/production' : nodeEnv}`);
  console.log(`  Clés    : ${values.size}`);
  console.log('');

  if (warnings.length > 0) {
    console.log(`  ⚠️  Avertissements (${warnings.length})`);
    for (const warning of warnings) console.log(`     - ${warning}`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`  ❌ Erreurs (${errors.length})`);
    for (const error of errors) console.log(`     - ${error}`);
    console.log('');
    process.exit(1);
  }

  console.log('  ✅ Configuration runtime acceptable pour ce mode');
}

main();
