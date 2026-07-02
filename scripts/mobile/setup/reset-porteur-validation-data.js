#!/usr/bin/env node
/**
 * Reset jeu porteur — purge métier + seed minimal pour validation mobile étape 2.
 *
 * Cible par défaut : ADMIN_EMAIL (ex. admin@jobbingtrack.com).
 * Jeu seedé : 7 candidatures (1 par entreprise) + 1 contact autonome — scénarios
 * entremêlés (relances, appels, entretiens, calendrier, notifications).
 *
 * Usage :
 *   node scripts/mobile/setup/reset-porteur-validation-data.js --dry-run
 *   node scripts/mobile/setup/reset-porteur-validation-data.js --confirm
 *   node scripts/mobile/setup/reset-porteur-validation-data.js --confirm --account user
 *   node scripts/mobile/setup/reset-porteur-validation-data.js --confirm --email admin@jobbingtrack.com
 *   node scripts/mobile/setup/reset-porteur-validation-data.js --purge-only --confirm
 */

const { loadRootEnv } = require('../lib/resolve-admin-credentials');
const { purgeUserBusinessData, reassignSeededOwnership, getUserId } = require('../lib/purge-user-business-data');
const { createRealisticSeedClient, INTERLEAVED_SCENARIOS } = require('../lib/seed-realistic-api');
const {
  resolveCredentialsForAccount,
  GATEWAY_URL,
} = require('../lib/resolve-porteur-credentials');
const {
  verifyScenario,
  verifyGlobalExpect,
} = require('../lib/interleaved-scenarios');

loadRootEnv();

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONFIRM = args.has('--confirm');
const PURGE_ONLY = args.has('--purge-only');
const SEED_ONLY = args.has('--seed-only');
const SKIP_VERIFY = args.has('--skip-verify');

function readAccountArg() {
  const idx = process.argv.indexOf('--account');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (args.has('--user')) return 'user';
  if (args.has('--admin')) return 'admin';
  return 'admin';
}

function readEmailArg() {
  const idx = process.argv.indexOf('--email');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

function printCounts(label, counts) {
  console.log(
    `  ${label}: candidatures=${counts.applications}, entreprises=${counts.companies}, contacts=${counts.contacts}, entretiens=${counts.interviews}, relances=${counts.followUps}, appels=${counts.calls}, événements=${counts.events}, notifications=${counts.notifications}`,
  );
}

async function login(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 200 || !data.token) {
    throw new Error(`Login KO ${res.status} pour ${email}`);
  }
  return data.token;
}

async function verifySeededData(token) {
  const client = createRealisticSeedClient({ gatewayUrl: GATEWAY_URL, token, delayMs: 0 });
  const { api } = client;
  let failed = 0;

  const pass = (name, detail = '') => {
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const fail = (name, detail = '') => {
    failed += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const appsRes = await api('GET', '/api/v1/applications?limit=200');
  const apps = appsRes.data.applications || [];
  if (appsRes.status !== 200) {
    fail('Liste candidatures', `${appsRes.status}`);
    return false;
  }
  pass('Liste candidatures', `${apps.length} ligne(s)`);

  const interviewsRes = await api('GET', '/api/v1/interviews?limit=200');
  const contactsRes = await api('GET', '/api/v1/contacts?limit=200');
  const ctx = {
    apps,
    pass,
    fail,
    api,
    interviewsCache: interviewsRes.data.interviews || [],
    contactsCache: contactsRes.data.contacts || [],
  };

  for (const scenario of INTERLEAVED_SCENARIOS) {
    await verifyScenario(scenario, ctx);
  }
  await verifyGlobalExpect(ctx);
  return failed === 0;
}

async function main() {
  const account = readAccountArg();
  const explicitEmail = readEmailArg();

  console.log(`\n=== Reset données porteur — validation mobile ===`);
  console.log(`Gateway : ${GATEWAY_URL}`);
  console.log(`Scénarios : ${INTERLEAVED_SCENARIOS.length} (max 1 candidature / entreprise)\n`);

  if (!DRY_RUN && !CONFIRM) {
    console.error(
      '⚠️  Opération destructive. Relancer avec --confirm (ou --dry-run pour audit seul).\n',
    );
    process.exit(1);
  }

  let creds;
  if (explicitEmail) {
    creds = await resolveCredentialsForAccount(explicitEmail);
  } else {
    creds = await resolveCredentialsForAccount(account);
  }

  console.log(`Compte cible : ${creds.email} (${creds.source || account})\n`);

  if (!SEED_ONLY) {
    console.log('--- Audit / purge métier ---\n');
    const purgeResult = await Promise.resolve(
      purgeUserBusinessData(creds.email, { dryRun: DRY_RUN }),
    );
    printCounts('Avant', purgeResult.before);

    if (DRY_RUN) {
      console.log('\n(dry-run — aucune suppression)\n');
    } else {
      printCounts('Après purge', purgeResult.after);
      const totalDeleted = Object.values(purgeResult.deleted).reduce((s, n) => s + n, 0);
      console.log(`\nTotal lignes supprimées : ${totalDeleted}\n`);
    }
  }

  if (PURGE_ONLY || DRY_RUN) {
    if (PURGE_ONLY) console.log('Mode --purge-only : seed ignoré.\n');
    return;
  }

  console.log('--- Seed jeu réaliste (API) ---\n');
  const token = await login(creds.email, creds.password);
  const seedClient = createRealisticSeedClient({
    gatewayUrl: GATEWAY_URL,
    token,
    delayMs: Number(process.env.SEED_API_DELAY_MS || 350),
  });
  const seedSummary = await seedClient.seedInterleavedScenarios();
  reassignSeededOwnership(getUserId(creds.email));
  console.log(
    `\nSeed terminé : ${seedSummary.applicationCount} candidature(s), ${seedSummary.scenarioCount} scénarios.\n`,
  );

  if (!SKIP_VERIFY) {
    console.log('--- Vérification smoke API ---\n');
    const ok = await verifySeededData(token);
    if (!ok) {
      console.error('\n❌ Vérification incomplète — relancer smoke-interleaved-entities-api.js\n');
      process.exit(1);
    }
    console.log('\n✅ Jeu porteur prêt — reconnectez l’app mobile sur ce compte.\n');
  }
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
