#!/usr/bin/env node
/**
 * Construit deploy/production/.env.preprod.generated et .env.prod.generated
 * à partir du .env racine (mêmes secrets) + surcharges VPS uniquement.
 *
 * Usage : node scripts/deploy/build-portainer-env.cjs
 *         node scripts/deploy/build-portainer-env.cjs --source /path/.env
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const sourceArg = process.argv.find((a, i) => process.argv[i - 1] === '--source');
const SOURCE = sourceArg ? path.resolve(sourceArg) : path.join(ROOT, '.env');

function parseEnvFile(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

/** Clés purement locales — exclues du fichier Portainer */
const EXCLUDE_KEYS = new Set([
  'DATABASE_URL',
  'POSTGRES_CLIENT_HOST',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'DEV_HTTPS_LAN_IP',
  'DEV_HTTPS_PORT',
  'EMULATOR_CONTROLLER_URL',
  'ADB_FAST',
  'ADB_UI_CACHE_MS',
  'ADB_WAIT_POLL_MS',
  'MOBILE_ADB_DEVICE',
  'MOBILE_PREFER_EMULATOR',
  'MOBILE_DEV_LAN_HOST',
  'MOBILE_ANDROID_DOWNLOAD_BASE_URL',
  'HOST_IP',
  'CVE_SCAN_PROJECT_ROOT',
  'CONFIGURE_EMULATOR_GMAIL',
  'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_EMAIL',
  'NEXT_PUBLIC_VERIFICATION_BLUEMAIL_PASSWORD',
  'NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL',
  'DEV_AUTH_BYPASS_TOKEN',
  'DEV_TEST_BYPASS_TOKEN',
  // PAT GitHub → Portainer UI « Authentication » uniquement, jamais dans les env stack
  'GITHUB_PAT',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'MOBILE_GITHUB_TOKEN',
  'JOBBINGTRACK_STACK_MEMORY_LIMIT_MB',
  'LOCAL_UID',
  'LOCAL_GID',
  'WATCHPACK_POLLING',
  'FLUTTER_MOBILE_PORT',
  'FLUTTER_MOBILE_INTERNAL_PORT',
  'DEPLOYMENT_SERVICE_PORT',
  'DEPLOYMENT_SERVICE_INTERNAL_PORT',
  'MAILHOG_SMTP_PORT',
  'MAILHOG_WEB_PORT',
  'MAILHOG_PORT',
  'LOG_COLLECTOR_C_PORT',
  'LOG_COLLECTOR_C_LEGACY_PORT',
  'MONITORING_C_PORT',
  'MONITORING_RS_PORT',
  'LOG_COLLECTOR_RS_PORT',
]);

const EXCLUDE_PREFIXES = [
  'TEST_',
  'PLAYWRIGHT_',
  'E2E_',
  'RUN_PLAYWRIGHT',
];

function shouldExclude(key) {
  if (EXCLUDE_KEYS.has(key)) return true;
  return EXCLUDE_PREFIXES.some((p) => key.startsWith(p));
}

function escapeEnvValue(val) {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (/[\s#"\\=]/.test(s)) return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return s;
}

function buildContainerList(slug) {
  const services = [
    'api-gateway',
    'auth-service',
    'frontend',
    'postgres',
    'redis',
    'metrics-aggregator',
    'security-service',
    'monitoring-agent-rs',
    'log-collector-rs',
  ];
  return services.map((s) => `${slug}-${s}`).join(',');
}

function applyMissingRequired(base, slug) {
  const out = { ...base };
  if (!out.REDIS_PASSWORD) {
    out.REDIS_PASSWORD = out.JWT_SECRET || out.SECURITY_INTERNAL_SECRET || '';
  }
  if (!out.REDIS_PASSWORD) {
    throw new Error('REDIS_PASSWORD manquant et impossible à déduire — renseigne-le dans .env');
  }
  out.EMAIL_PROVIDER = (out.EMAIL_PROVIDER || 'SMTP').toLowerCase() === 'smtp' ? 'smtp' : out.EMAIL_PROVIDER;
  out.NODE_ENV = 'production';
  out.PORT = out.PORT || '3000';
  out.LOG_LEVEL = out.LOG_LEVEL || 'info';
  out.STACK_SLUG = slug;
  out.IMAGE_REGISTRY = out.IMAGE_REGISTRY || 'ghcr.io/paveldelhomme';
  out.ENABLE_METRICS_AUTH = out.ENABLE_METRICS_AUTH ?? 'true';
  out.ENABLE_METRICS_COLLECTION = out.ENABLE_METRICS_COLLECTION ?? 'true';
  out.ENABLE_CENTRAL_LOGGING = out.ENABLE_CENTRAL_LOGGING ?? 'true';
  out.INTRUSION_RELAX_HEURISTICS = out.INTRUSION_RELAX_HEURISTICS ?? 'false';
  out.SECURITY_CRITICAL_SERVICES = buildContainerList(slug);
  return out;
}

const PREPROD_OVERRIDES = {
  STACK_SLUG: 'jobbingtrack-preprod',
  JT_RUNTIME_ENV: 'preproduction',
  IMAGE_TAG: 'dev',
  IMAGE_PULL_POLICY: 'build',
  API_PUBLISH_HOST: '127.0.0.1',
  API_PUBLISH_PORT: '3010',
  FRONTEND_PUBLISH_HOST: '127.0.0.1',
  FRONTEND_PUBLISH_PORT: '3011',
  NEXT_PUBLIC_API_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_API_GATEWAY_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_AUTH_SERVICE_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  NEXT_PUBLIC_USER_FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  NEXT_PUBLIC_BACKOFFICE_URL: 'https://jobbingtrack-preprod.delhomme.ovh/b4ck0ff1ce',
  FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  FRONTEND_PUBLIC_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  APP_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  BACKEND_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  BACKOFFICE_FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh/b4ck0ff1ce',
  USER_FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  DEV_HTTPS_API_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  DEV_HTTPS_FRONTEND_URL: 'https://jobbingtrack-preprod.delhomme.ovh',
  PUBLIC_API_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  API_GATEWAY_PUBLIC_URL: 'https://api-preprod.jobbingtrack.delhomme.ovh',
  GOOGLE_OAUTH_REDIRECT_URI:
    'https://api-preprod.jobbingtrack.delhomme.ovh/api/v1/email-agent/oauth/google/callback',
  ALLOWED_ORIGINS:
    'https://jobbingtrack-preprod.delhomme.ovh,https://api-preprod.jobbingtrack.delhomme.ovh',
  POSTGRES_DB: 'jobbingtrack_preprod',
  TRUST_PROXY_HOPS: '2',
  MOBILE_ANDROID_LATEST_VERSION: '1.0.42',
  MOBILE_ANDROID_LATEST_BUILD: '42',
  MOBILE_ANDROID_RELEASE_NOTES: 'Préprod OTA canal dev',
};

const PROD_OVERRIDES = {
  STACK_SLUG: 'jobbingtrack-prod',
  JT_RUNTIME_ENV: 'production',
  IMAGE_TAG: 'latest',
  IMAGE_PULL_POLICY: 'always',
  API_PUBLISH_HOST: '127.0.0.1',
  API_PUBLISH_PORT: '3020',
  FRONTEND_PUBLISH_HOST: '127.0.0.1',
  FRONTEND_PUBLISH_PORT: '3021',
  NEXT_PUBLIC_API_URL: 'https://api.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_API_GATEWAY_URL: 'https://api.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_AUTH_SERVICE_URL: 'https://api.jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_USER_FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh',
  NEXT_PUBLIC_BACKOFFICE_URL: 'https://jobbingtrack.delhomme.ovh/b4ck0ff1ce',
  FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh',
  FRONTEND_PUBLIC_URL: 'https://jobbingtrack.delhomme.ovh',
  APP_URL: 'https://jobbingtrack.delhomme.ovh',
  BACKEND_URL: 'https://api.jobbingtrack.delhomme.ovh',
  BACKOFFICE_FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh/b4ck0ff1ce',
  USER_FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh',
  DEV_HTTPS_API_URL: 'https://api.jobbingtrack.delhomme.ovh',
  DEV_HTTPS_FRONTEND_URL: 'https://jobbingtrack.delhomme.ovh',
  PUBLIC_API_URL: 'https://api.jobbingtrack.delhomme.ovh',
  API_GATEWAY_PUBLIC_URL: 'https://api.jobbingtrack.delhomme.ovh',
  GOOGLE_OAUTH_REDIRECT_URI:
    'https://api.jobbingtrack.delhomme.ovh/api/v1/email-agent/oauth/google/callback',
  ALLOWED_ORIGINS: 'https://jobbingtrack.delhomme.ovh,https://api.jobbingtrack.delhomme.ovh',
  POSTGRES_DB: 'jobbingtrack_prod',
  TRUST_PROXY_HOPS: '2',
  MOBILE_ANDROID_LATEST_VERSION: '1.0.42',
  MOBILE_ANDROID_LATEST_BUILD: '42',
  MOBILE_ANDROID_RELEASE_NOTES: 'Production',
};

/** Ordre : clés compose obligatoires d'abord, puis le reste alpha */
const PRIORITY_KEYS = [
  'STACK_SLUG',
  'IMAGE_REGISTRY',
  'IMAGE_TAG',
  'IMAGE_PULL_POLICY',
  'API_PUBLISH_HOST',
  'API_PUBLISH_PORT',
  'FRONTEND_PUBLISH_HOST',
  'FRONTEND_PUBLISH_PORT',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_GATEWAY_URL',
  'NEXT_PUBLIC_AUTH_SERVICE_URL',
  'NEXT_PUBLIC_FRONTEND_URL',
  'FRONTEND_URL',
  'FRONTEND_PUBLIC_URL',
  'APP_URL',
  'ALLOWED_ORIGINS',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_MAX_CONNECTIONS',
  'POSTGRES_SYSTEM_METRICS_TZ',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SECURITY_INTERNAL_SECRET',
  'METRICS_API_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_FIRST_NAME',
  'ADMIN_LAST_NAME',
  'EMAIL_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_REPLY_TO',
  'SMTP_SECURE',
  'SMTP_USE_SSL',
];

function mergeForTarget(baseEnv, overrides) {
  const merged = {};
  for (const [k, v] of Object.entries(baseEnv)) {
    if (shouldExclude(k)) continue;
    if (v === undefined || v === '') continue;
    merged[k] = v;
  }
  Object.assign(merged, overrides);
  return applyMissingRequired(merged, overrides.STACK_SLUG);
}

function sortKeys(env) {
  const keys = Object.keys(env);
  const priority = PRIORITY_KEYS.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !PRIORITY_KEYS.includes(k)).sort();
  return [...priority, ...rest];
}

function writeEnvFile(outPath, title, env) {
  const lines = [
    `# ${title}`,
    `# Source : ${path.relative(ROOT, SOURCE)}`,
    `# Généré : ${new Date().toISOString()}`,
    `# NE PAS COMMITTER — coller dans Portainer > Environment variables (Load from .env file)`,
    '',
  ];
  for (const key of sortKeys(env)) {
    lines.push(`${key}=${escapeEnvValue(env[key])}`);
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Fichier source introuvable : ${SOURCE}`);
    process.exit(1);
  }
  const base = parseEnvFile(fs.readFileSync(SOURCE, 'utf8'));
  const preprod = mergeForTarget(base, PREPROD_OVERRIDES);
  const prod = mergeForTarget(base, PROD_OVERRIDES);

  const preprodPath = path.join(ROOT, 'deploy/production/.env.preprod.generated');
  const prodPath = path.join(ROOT, 'deploy/production/.env.prod.generated');

  writeEnvFile(
    preprodPath,
    'JobbingTrack PRÉPROD — stack jobbingtrack-preprod',
    preprod,
  );
  writeEnvFile(prodPath, 'JobbingTrack PROD — stack jobbingtrack-prod', prod);

  console.log('==> Fichiers Portainer générés depuis .env racine');
  console.log(`    Source : ${SOURCE}`);
  console.log(`    Préprod : ${preprodPath} (${Object.keys(preprod).length} clés)`);
  console.log(`    Prod    : ${prodPath} (${Object.keys(prod).length} clés)`);
  console.log('');
  console.log(`    ADMIN_EMAIL (inchangé) : ${preprod.ADMIN_EMAIL}`);
  console.log('    Mots de passe = identiques à ton .env local (POSTGRES, JWT, SMTP, ADMIN…)');
  if (!base.REDIS_PASSWORD) {
    console.log('    Note : REDIS_PASSWORD absent du .env → réutilisation JWT_SECRET pour Redis VPS');
  }
  console.log('');
  console.log('    Portainer → stack jobbingtrack-preprod → Environment variables → Load from .env file');
}

main();
