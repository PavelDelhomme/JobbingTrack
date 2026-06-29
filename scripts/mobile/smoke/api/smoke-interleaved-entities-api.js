#!/usr/bin/env node
/**
 * Vérifie le jeu seedé entremêlé (candidatures, contacts, relances, entretiens,
 * appels, calendrier) — scénarios OK et cas limites attendus.
 *
 * Prérequis : seed-realistic-user-data-api.js exécuté avant.
 * Usage : node scripts/mobile/smoke/api/smoke-interleaved-entities-api.js
 */

const { resolveWorkingUserCredentials, GATEWAY_URL } = require('../../lib/resolve-user-credentials');
const { loadRootEnv } = require('../../lib/resolve-admin-credentials');

loadRootEnv();

const results = [];
let token = null;

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, body) {
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
    data = { raw: text?.slice(0, 200) };
  }
  return { status: res.status, data };
}

function findApp(apps, companyFragment, positionFragment) {
  return apps.find((a) => {
    const co = (a.company?.name || a.companyName || '').toLowerCase();
    const pos = (a.position || a.title || '').toLowerCase();
    return co.includes(companyFragment.toLowerCase()) && pos.includes(positionFragment.toLowerCase());
  });
}

async function main() {
  console.log(`\n=== Smoke entités entremêlées — ${GATEWAY_URL} ===\n`);

  const creds = await resolveWorkingUserCredentials();
  const login = await api('POST', '/api/v1/auth/login', {
    email: creds.email,
    password: creds.password,
  });
  if (login.status !== 200 || !login.data.token) {
    fail('Login TEST_USER', `${login.status}`);
    return summary();
  }
  token = login.data.token;
  pass('Login TEST_USER', creds.email);

  const appsRes = await api('GET', '/api/v1/applications?limit=200');
  const apps = appsRes.data.applications || [];
  if (appsRes.status !== 200) {
    fail('Liste candidatures', `${appsRes.status}`);
    return summary();
  }
  pass('Liste candidatures', `${apps.length} ligne(s)`);

  const cap = findApp(apps, 'Capgemini', 'Full Stack');
  const orange = findApp(apps, 'Orange', 'Ingénieur');
  const thales = findApp(apps, 'Thales', 'DevOps');
  const atos = findApp(apps, 'Atos', 'Consultant');
  const sopra = findApp(apps, 'Sopra', 'Lead Developer');
  const dassault = findApp(apps, 'Dassault', 'Architecte');
  const ovh = findApp(apps, 'OVHcloud', 'SRE');

  for (const [label, app] of [
    ['Capgemini', cap],
    ['Orange', orange],
    ['Thales', thales],
    ['Atos', atos],
    ['Sopra Steria', sopra],
    ['Dassault', dassault],
    ['OVHcloud', ovh],
  ]) {
    if (app?.id) pass(`Seed candidature ${label}`, app.id);
    else fail(`Seed candidature ${label}`, 'introuvable — lancer seed-realistic-user-data-api.js');
  }

  if (cap?.id) {
    const contacts = await api('GET', `/api/v1/contacts/application/${cap.id}`);
    const n = contacts.data.contacts?.length ?? contacts.data.total ?? 0;
    if (contacts.status === 200 && n >= 1) pass('Capgemini — contact lié', `${n} contact(s)`);
    else fail('Capgemini — contact lié', `${contacts.status} n=${n}`);

    const interviewsRes = await api('GET', '/api/v1/interviews?limit=200');
    const inCount = (interviewsRes.data.interviews || []).filter(
      (i) => i.applicationId === cap.id,
    ).length;
    if (interviewsRes.status === 200 && inCount >= 1) pass('Capgemini — entretien', `${inCount}`);
    else fail('Capgemini — entretien', `${interviewsRes.status}`);

    const followups = await api('GET', `/api/v1/followups?applicationId=${cap.id}&limit=50`);
    const fuCount = followups.data.followups?.length ?? followups.data.followUps?.length ?? 0;
    if (followups.status === 200 && fuCount >= 1) pass('Capgemini — relance', `${fuCount}`);
    else fail('Capgemini — relance', `${followups.status}`);
  }

  if (orange?.id) {
    const followups = await api('GET', `/api/v1/followups?applicationId=${orange.id}&limit=50`);
    const fuCount = followups.data.followups?.length ?? followups.data.followUps?.length ?? 0;
    if (fuCount >= 2) pass('Orange — 2 relances', `${fuCount}`);
    else fail('Orange — 2 relances', `trouvé ${fuCount}`);

    const calls = await api('GET', `/api/v1/calls?applicationId=${orange.id}`);
    const callList = calls.data.calls || [];
    const relanceCall = callList.find((c) =>
      (c.subject || '').toLowerCase().includes('relance'),
    );
    if (calls.status === 200 && relanceCall) {
      pass('Orange — appel relance', relanceCall.subject || relanceCall.id);
    } else fail('Orange — appel relance', `calls=${callList.length}`);
  }

  if (thales?.id) {
    const interviewsRes = await api('GET', '/api/v1/interviews?limit=200');
    const inCount = (interviewsRes.data.interviews || []).filter(
      (i) => i.applicationId === thales.id,
    ).length;
    if (inCount >= 1) pass('Thales — entretien seul', `${inCount}`);
    else fail('Thales — entretien seul', '0 entretien');
  }

  if (atos?.id) {
    const st = typeof atos.status === 'string' ? atos.status : String(atos.status?.code || atos.status || '');
    if (st.includes('REJECTED')) pass('Atos — statut refus sans entretien', st);
    else fail('Atos — statut refus', st || 'statut inattendu');
  }

  if (sopra?.id) {
    const calls = await api('GET', `/api/v1/calls?applicationId=${sopra.id}`);
    const callList = calls.data.calls || [];
    const withoutNamedContact = callList.some((c) => !c.contactId && !c.contact?.id);
    if (callList.length >= 1 && withoutNamedContact) pass('Sopra — appel sans contact nominatif');
    else fail('Sopra — appel sans contact', `calls=${callList.length}`);
  }

  if (dassault?.id) {
    const contacts = await api('GET', `/api/v1/contacts/application/${dassault.id}`);
    const n = contacts.data.contacts?.length ?? 0;
    if (n >= 1) pass('Dassault — contact sans appel', `${n} contact(s)`);
    else fail('Dassault — contact', 'aucun contact');
  }

  const contactsAll = await api('GET', '/api/v1/contacts?limit=200');
  const contacts = contactsAll.data.contacts || [];
  const luc = contacts.find(
    (c) => (c.firstName || '').toLowerCase() === 'luc' && (c.lastName || '').toLowerCase() === 'petit',
  );
  if (luc) pass('Contact autonome Luc Petit (Capgemini)', luc.id);
  else fail('Contact autonome Luc Petit', 'introuvable');

  const companies = await api('GET', '/api/v1/companies?limit=200');
  const coList = companies.data.companies || [];
  if (companies.status === 200 && coList.length >= 5) {
    pass('Entreprises listées', `${coList.length}`);
  } else fail('Entreprises listées', `${companies.status} n=${coList.length}`);

  const events = await api('GET', '/api/v1/events?limit=50');
  const evCount = events.data.events?.length ?? 0;
  if (events.status === 200 && evCount >= 1) {
    pass('Calendrier / événements agrégés', `${evCount} événement(s)`);
  } else if (events.status === 200) {
    fail('Calendrier / événements', '0 événement — entretiens/relances non agrégés ?');
  } else {
    fail('Calendrier / événements', `${events.status}`);
  }

  const callsAll = await api('GET', '/api/v1/calls?limit=100');
  const callsCount = callsAll.data.calls?.length ?? 0;
  if (callsAll.status === 200 && callsCount >= 3) {
    pass('Appels globaux', `${callsCount} appel(s)`);
  } else fail('Appels globaux', `${callsCount} appel(s)`);

  summary();
}

function summary() {
  const ok = results.filter((r) => r.ok).length;
  const ko = results.filter((r) => !r.ok).length;
  console.log(`\n=== Bilan entités entremêlées : ${ok} OK, ${ko} KO ===\n`);
  if (ko > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

module.exports = { results: () => results };
