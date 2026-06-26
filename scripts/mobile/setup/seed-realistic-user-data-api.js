#!/usr/bin/env node
/**
 * Nettoie les données smoke (MobLiveCo-*, Dev Flutter *, Smoke *) puis seed un jeu
 * réaliste de candidatures / contacts / relances / entretiens / appels pour TEST_USER.
 *
 * Usage :
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js --seed-only   # sans nettoyage
 *   node scripts/mobile/setup/seed-realistic-user-data-api.js --cleanup-only
 *
 * Throttle : SEED_API_DELAY_MS=350 (défaut) entre requêtes — évite rafales WAF/rate-limit.
 * Prérequis : stack up, TEST_USER_* dans .env, gateway 5002.
 *
 * Note : import mail réel (candidatures@delhomme.ovh) bloqué tant que IMAP OVH KO (BL-26-02).
 */

const { resolveWorkingUserCredentials, GATEWAY_URL } = require('../lib/resolve-user-credentials');
const { loadRootEnv } = require('../lib/resolve-admin-credentials');
const { createApiThrottle } = require('../../../tools/api/throttle');

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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
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
  const body = {
    callDate,
    subject,
    notes,
  };
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

  // 1. Capgemini — entretien + relance + appel contact
  const cap = await createApplication({
    position: 'Développeur Full Stack',
    companyName: 'Capgemini',
    status: 'AWAITING_INTERVIEW',
    applicationDate: daysAgo(18),
    location: 'Paris La Défense',
    notes: 'Candidature via LinkedIn — profil Java/React',
  });
  const capContact = await createContact({
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@capgemini.com',
    phone: '+33 6 12 34 56 01',
    companyId: cap.companyId,
    position: 'Chargée de recrutement IT',
  });
  await linkContact(capContact.id, cap.id);
  await createInterview(cap.id, daysAhead(5), '[Format: Distanciel]\nEntretien RH puis technique', 'Visio Teams');
  await createFollowUp(cap.id, daysAgo(10), 'Relance après envoi CV — réponse positive');
  await createCall({
    applicationId: cap.id,
    contactId: capContact.id,
    callDate: daysAgo(12),
    subject: 'Premier échange RH',
    notes: '15 min — créneaux entretien proposés',
  });
  console.log('✅ Capgemini — entretien + relance + appel contact');

  // 2. Orange — sans réponse, 2 relances, appel de relance lié
  const orange = await createApplication({
    position: 'Ingénieur réseau',
    companyName: 'Orange',
    status: 'NO_RESPONSE',
    applicationDate: daysAgo(35),
    location: 'Rennes',
    notes: 'Offre site careers.orange.com',
  });
  const fu1 = await createFollowUp(orange.id, daysAgo(21), 'Relance email n°1 — pas de réponse');
  const fu2 = await createFollowUp(orange.id, daysAgo(7), 'Relance email n°2 — toujours silence');
  const orangeContact = await createContact({
    firstName: 'Thomas',
    lastName: 'Bernard',
    email: 'thomas.bernard@orange.com',
    phone: '+33 6 98 76 54 32',
    companyId: orange.companyId,
    position: 'Responsable recrutement',
  });
  await linkContact(orangeContact.id, orange.id);
  const relanceCall = await createCall({
    applicationId: orange.id,
    contactId: orangeContact.id,
    callDate: daysAgo(5),
    subject: 'Appel de relance téléphonique',
    notes: 'Messagerie — rappel prévu',
  });
  await linkCallToFollowUp(relanceCall.id, fu2.id);
  console.log('✅ Orange — 2 relances + appel relance lié');

  // 3. Thales — entretien sans relance
  const thales = await createApplication({
    position: 'DevOps Engineer',
    companyName: 'Thales',
    status: 'AWAITING_INTERVIEW',
    applicationDate: daysAgo(8),
    location: 'Velizy-Villacoublay',
    notes: 'Recommandation ex-collègue',
  });
  await createInterview(thales.id, daysAhead(2), '[Format: Présentiel]\nEntretien manager', 'Site Thales Velizy');
  console.log('✅ Thales — entretien sans relance');

  // 4. Atos — refusée, sans entretien ni relance
  await createApplication({
    position: 'Consultant SI',
    companyName: 'Atos',
    status: 'REJECTED_WITHOUT_INTERVIEW',
    applicationDate: daysAgo(45),
    location: 'Lyon',
    notes: 'Refus reçu par email après 3 semaines',
  });
  console.log('✅ Atos — refusée sans suite');

  // 5. Sopra Steria — appel entreprise sans contact nominatif
  const sopra = await createApplication({
    position: 'Lead Developer Java',
    companyName: 'Sopra Steria',
    status: 'CANDIDATE_PENDING',
    applicationDate: daysAgo(14),
    location: 'Bordeaux',
    notes: 'Candidature spontanée',
  });
  await createCall({
    applicationId: sopra.id,
    callDate: daysAgo(3),
    subject: 'Appel standard accueil entreprise',
    notes: 'Orientation vers service RH — pas de contact direct',
  });
  console.log('✅ Sopra Steria — appel sans contact');

  // 6. Dassault — contact créé, candidature en attente
  const dassault = await createApplication({
    position: 'Architecte Cloud AWS',
    companyName: 'Dassault Systèmes',
    status: 'CANDIDATE_PENDING',
    applicationDate: daysAgo(5),
    location: 'Vélizy',
    notes: 'Profil cloud / Kubernetes',
  });
  const dsContact = await createContact({
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@3ds.com',
    phone: '+33 6 11 22 33 44',
    companyId: dassault.companyId,
    position: 'Talent Acquisition',
  });
  await linkContact(dsContact.id, dassault.id);
  console.log('✅ Dassault — contact lié, pas encore d’appel');

  // 7. Contact autonome (entreprise existante Capgemini) sans nouvelle candidature
  await createContact({
    firstName: 'Luc',
    lastName: 'Petit',
    email: 'luc.petit@capgemini.com',
    phone: '+33 6 55 44 33 22',
    companyId: cap.companyId,
    position: 'Directeur technique',
  });
  console.log('✅ Contact autonome Capgemini (sans nouvelle candidature)');

  // 8. OVHcloud — plusieurs relances, pas d’appel
  const ovh = await createApplication({
    position: 'SRE Platform Engineer',
    companyName: 'OVHcloud',
    status: 'CANDIDATE_PENDING',
    applicationDate: daysAgo(22),
    location: 'Roubaix',
    notes: 'Aligné stack interne — candidatures@delhomme.ovh',
  });
  await createFollowUp(ovh.id, daysAgo(15), 'Relance J+7');
  await createFollowUp(ovh.id, daysAgo(8), 'Relance J+14');
  console.log('✅ OVHcloud — 2 relances sans appel');

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
  console.log('Ouvrez l’app mobile pour parcourir les scénarios.\n');
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
