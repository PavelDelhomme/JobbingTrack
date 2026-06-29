#!/usr/bin/env node
/**
 * Nettoie les données smoke (MobLiveCo-*, Dev Flutter *, Smoke *) puis seed un jeu
 * réaliste de candidatures / contacts / relances / entretiens / appels pour TEST_USER.
 *
 * Scénarios : scripts/mobile/lib/interleaved-scenarios.js (source unique seed + smoke).
 *
 * Usage :
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js --seed-only
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js --cleanup-only
 */

const { resolveWorkingUserCredentials, GATEWAY_URL } = require('../lib/resolve-user-credentials');
const { loadRootEnv } = require('../lib/resolve-admin-credentials');
const { createApiThrottle } = require('../../../tools/api/throttle');
const { INTERLEAVED_SCENARIOS, seedScenario } = require('../lib/interleaved-scenarios');

loadRootEnv();

const args = new Set(process.argv.slice(2));
const SKIP_CLEANUP = args.has('--skip-cleanup') || args.has('--seed-only');
const CLEANUP_ONLY = args.has('--cleanup-only');
const throttle = createApiThrottle(350);

let token = null;

async function api(method, path, body) {
  await throttle.waitTurn();
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data = {};
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function isSmokeApplication(app) {
  const pos = (app.position || app.title || '').toString();
  const company = (app.company?.name || app.companyName || '').toString();
  const notes = (app.notes || '').toString();
  return (
    company.startsWith('MobLiveCo-') ||
    /^Dev Flutter \d+$/.test(pos) ||
    pos.includes('Smoke') ||
    notes.toLowerCase().includes('smoke')
  );
}

function isSmokeContact(c) {
  const fn = (c.firstName || '').toString();
  const ln = (c.lastName || '').toString();
  const email = (c.email || '').toString();
  return fn === 'Smoke' || ln.startsWith('Contact') || email.includes('smoke.') || email.includes('@example.test');
}

function isSmokeCompany(name) {
  const n = (name || '').toString();
  return n.startsWith('MobLiveCo-') || n.includes('Smoke');
}

async function login(email, password) {
  const { status, data } = await api('POST', '/api/v1/auth/login', { email, password });
  if (status !== 200 || !data.token) throw new Error(`Login KO ${status}`);
  return data.token;
}

async function cleanup() {
  console.log('\n--- Nettoyage données smoke ---\n');

  const appsRes = await api('GET', '/api/v1/applications?limit=200');
  const apps = appsRes.data.applications || [];
  let deletedApps = 0;
  for (const app of apps) {
    if (!isSmokeApplication(app)) continue;
    const id = app.id;
    const del = await api('DELETE', `/api/v1/applications/${id}`);
    if (del.status === 200 || del.status === 204) {
      deletedApps += 1;
      console.log(`  🗑 candidature smoke supprimée : ${app.position} @ ${app.company?.name || '?'}`);
    }
  }

  const contactsRes = await api('GET', '/api/v1/contacts?limit=200');
  const contacts = contactsRes.data.contacts || [];
  let deletedContacts = 0;
  for (const c of contacts) {
    if (!isSmokeContact(c)) continue;
    const del = await api('DELETE', `/api/v1/contacts/${c.id}`);
    if (del.status === 200 || del.status === 204) {
      deletedContacts += 1;
      console.log(`  🗑 contact smoke supprimé : ${c.firstName} ${c.lastName}`);
    }
  }

  const companiesRes = await api('GET', '/api/v1/companies?limit=200');
  const companies = companiesRes.data.companies || [];
  let deletedCompanies = 0;
  for (const co of companies) {
    if (!isSmokeCompany(co.name)) continue;
    const del = await api('DELETE', `/api/v1/companies/${co.id}`);
    if (del.status === 200 || del.status === 204) {
      deletedCompanies += 1;
      console.log(`  🗑 entreprise smoke supprimée : ${co.name}`);
    }
  }

  console.log(`\nRésumé nettoyage : ${deletedApps} candidature(s), ${deletedContacts} contact(s), ${deletedCompanies} entreprise(s)\n`);
}

async function createApplication({ position, companyName, status, applicationDate, location, notes, contractType = 'CDI' }) {
  const res = await api('POST', '/api/v1/applications', {
    position,
    companyName,
    contractType,
    applicationType: 'OFFRE',
    applicationDate: applicationDate || new Date().toISOString(),
    location: location || 'France',
    notes: notes || '',
    status,
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Créer candidature ${position} @ ${companyName} : ${res.status} ${JSON.stringify(res.data).slice(0, 120)}`);
  }
  const app = res.data.application || res.data;
  return { id: app.id, companyId: app.companyId || app.company?.id, raw: app };
}

async function createContact({ firstName, lastName, email, phone, companyId, position }) {
  const res = await api('POST', '/api/v1/contacts', {
    firstName,
    lastName,
    email,
    phone,
    companyId,
    position,
  });
  if (res.status !== 201) {
    throw new Error(`Créer contact ${firstName} ${lastName} : ${res.status}`);
  }
  return res.data.contact;
}

async function linkContact(contactId, applicationId) {
  const res = await api('POST', `/api/v1/contacts/${contactId}/link-application`, { applicationId });
  if (res.status !== 200) throw new Error(`Lier contact ${contactId} : ${res.status}`);
}

async function createFollowUp(applicationId, followUpDate, notes) {
  const res = await api('POST', '/api/v1/followups', {
    applicationId,
    followUpDate,
    notes,
  });
  if (res.status !== 201) throw new Error(`Créer relance : ${res.status}`);
  return res.data.followUp || res.data.followup;
}

async function createInterview(applicationId, interviewDate, notes, location) {
  const res = await api('POST', '/api/v1/interviews', {
    applicationId,
    interviewDate,
    notes,
    location,
  });
  if (res.status !== 201) throw new Error(`Créer entretien : ${res.status}`);
  return res.data.interview;
}

async function createCall({ applicationId, callDate, subject, notes, contactId, companyId }) {
  const body = { callDate, subject, notes };
  if (applicationId) body.applicationId = applicationId;
  if (contactId) body.contactId = contactId;
  if (companyId) body.companyId = companyId;
  const res = await api('POST', '/api/v1/calls', body);
  if (res.status !== 201) throw new Error(`Créer appel : ${res.status} ${JSON.stringify(res.data).slice(0, 80)}`);
  return res.data.call;
}

async function linkCallToFollowUp(callId, followUpId) {
  const res = await api('PUT', `/api/v1/calls/${callId}`, { followUpId });
  if (res.status !== 200) throw new Error(`Lier appel→relance : ${res.status}`);
}

async function seed() {
  console.log('--- Seed jeu réaliste (scénarios variés) ---\n');

  const ctx = {
    api,
    createApplication,
    createContact,
    linkContact,
    createFollowUp,
    createInterview,
    createCall,
    linkCallToFollowUp,
    seeded: {},
  };

  for (const scenario of INTERLEAVED_SCENARIOS) {
    const result = await seedScenario(scenario, ctx);
    if (scenario.kind === 'application') ctx.seeded[scenario.id] = result;
    console.log(`✅ ${scenario.label} — ${scenario.seedSummary || scenario.kind}`);
  }

  console.log('\n--- Seed terminé ---\n');
}

async function main() {
  console.log(`\n=== Seed données réalistes TEST_USER — ${GATEWAY_URL} ===`);
  console.log(`Throttle : ${throttle.delayMs} ms entre requêtes (SEED_API_DELAY_MS)\n`);
  const creds = await resolveWorkingUserCredentials();
  console.log(`Compte : ${creds.email}\n`);
  token = await login(creds.email, creds.password);

  if (!SKIP_CLEANUP) {
    await cleanup();
  } else {
    console.log('Nettoyage ignoré (--seed-only / --skip-cleanup)\n');
  }

  if (!CLEANUP_ONLY) {
    await seed();
  }

  const summary = await api('GET', '/api/v1/applications?limit=200');
  const count = (summary.data.applications || []).length;
  console.log(`Total candidatures visibles : ${count}`);
  console.log(`Scénarios déclarés : ${INTERLEAVED_SCENARIOS.length}`);
  console.log('Ouvrez l’app mobile pour parcourir les scénarios.\n');
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
