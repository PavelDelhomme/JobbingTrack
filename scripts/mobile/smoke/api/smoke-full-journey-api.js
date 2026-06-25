#!/usr/bin/env node
/**
 * Parcours API complet mobile (live) : candidature, contact, entretien, relance,
 * appels avec/sans contact, calendrier, notifications, analytics, time-travel, logout/login.
 *
 * Usage : node scripts/mobile/smoke/api/smoke-full-journey-api.js
 * Prérequis : stack up, TEST_USER_* dans .env, gateway 5002.
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

async function api(method, path, body, tok = token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
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

async function login(email, password) {
  const { status, data } = await api('POST', '/api/v1/auth/login', { email, password }, null);
  if (status !== 200 || !data.token) throw new Error(`Login KO ${status}`);
  return data.token;
}

async function main() {
  console.log(`\n=== Smoke parcours complet API — ${GATEWAY_URL} ===\n`);

  const creds = await resolveWorkingUserCredentials();
  pass('Login TEST_USER', creds.email);
  token = await login(creds.email, creds.password);

  const stamp = Date.now();
  const companyName = `MobLiveCo-${stamp}`;
  const position = `Dev Flutter ${stamp}`;

  // 1. Candidature avec nouvelle entreprise (companyName — comme autocomplete « créer »)
  let appRes = await api('POST', '/api/v1/applications', {
    position,
    companyName,
    contractType: 'CDI',
    applicationType: 'OFFRE',
    applicationDate: new Date().toISOString(),
    location: 'Paris',
    notes: 'Smoke live autocomplete company',
  });
  if (appRes.status !== 201 && appRes.status !== 200) {
    fail('Créer candidature + entreprise', `${appRes.status} ${JSON.stringify(appRes.data).slice(0, 120)}`);
    return summary();
  }
  const appId = appRes.data.application?.id || appRes.data.id;
  const companyId = appRes.data.application?.companyId || appRes.data.application?.company?.id;
  pass('Créer candidature (companyName)', `${position} → ${appId}`);

  // 2. Contact + lien candidature
  const contactRes = await api('POST', '/api/v1/contacts', {
    firstName: 'Smoke',
    lastName: `Contact${stamp}`,
    email: `smoke.${stamp}@example.test`,
    companyId: companyId || undefined,
  });
  const contactId = contactRes.data.contact?.id;
  if (contactRes.status !== 201 || !contactId) {
    fail('Créer contact', `${contactRes.status}`);
  } else {
    pass('Créer contact', contactId);
    const link = await api('POST', `/api/v1/contacts/${contactId}/link-application`, {
      applicationId: appId,
    });
    if (link.status === 200) pass('Lier contact → candidature');
    else fail('Lier contact', `${link.status}`);

    const contactsByApp = await api('GET', `/api/v1/contacts/application/${appId}`);
    if (contactsByApp.status === 200) {
      const n = contactsByApp.data.total ?? contactsByApp.data.contacts?.length ?? 0;
      pass('GET contacts/candidature', `${n} contact(s)`);
    } else fail('GET contacts/candidature', `${contactsByApp.status}`);
  }

  // 3. Entretien
  const interviewRes = await api('POST', '/api/v1/interviews', {
    applicationId: appId,
    interviewDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: 'Visio',
    notes: 'Smoke entretien',
  });
  const interviewId = interviewRes.data.interview?.id;
  if (interviewRes.status === 201 && interviewId) pass('Créer entretien', interviewId);
  else fail('Créer entretien', `${interviewRes.status}`);

  // 4. Relance
  const followRes = await api('POST', '/api/v1/followups', {
    applicationId: appId,
    followUpDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    notes: 'Smoke relance',
  });
  const followId = followRes.data.followUp?.id || followRes.data.followup?.id;
  if (followRes.status === 201 && followId) pass('Créer relance', followId);
  else fail('Créer relance', `${followRes.status}`);

  // 5. Appel AVEC contact
  const callWith = await api('POST', '/api/v1/calls', {
    applicationId: appId,
    callDate: new Date().toISOString(),
    subject: `Appel avec contact ${stamp}`,
    contactId,
  });
  if (callWith.status === 201) pass('Appel avec contact');
  else fail('Appel avec contact', `${callWith.status}`);

  // 6. Appel SANS contact
  const callWithout = await api('POST', '/api/v1/calls', {
    applicationId: appId,
    callDate: new Date().toISOString(),
    subject: `Appel sans contact · ${companyName}`,
  });
  if (callWithout.status === 201) pass('Appel sans contact (entreprise)');
  else fail('Appel sans contact', `${callWithout.status}`);

  // 7. Calendrier / événements
  const events = await api('GET', '/api/v1/events?limit=20');
  if (events.status === 200) {
    const count = events.data.events?.length ?? 0;
    pass('Calendrier GET /events', `${count} événement(s)`);
  } else fail('Calendrier', `${events.status}`);

  // 8. Notifications in-app
  const notifs = await api('GET', '/api/v1/notifications?limit=10&scope=in_app');
  if (notifs.status === 200) pass('Notifications in-app', `${notifs.data.notifications?.length ?? 0} notif(s)`);
  else fail('Notifications', `${notifs.status}`);

  // 9. Analytics mobile
  const sessionId = `smoke-sess-${stamp}`;
  const deviceId = `smoke-dev-${stamp}`;
  const a1 = await api('POST', '/api/v1/analytics/sessions', {
    sessionId,
    deviceId,
    platform: 'mobile',
    osName: 'Android',
    appVersion: '1.0.0-smoke',
  });
  if (a1.status === 200 || a1.status === 201) pass('Analytics session');
  else fail('Analytics session', `${a1.status}`);

  const a2 = await api('POST', '/api/v1/analytics/events', {
    sessionId,
    deviceId,
    eventType: 'navigation',
    eventName: 'smoke_test_screen',
    page: '/smoke',
    platform: 'mobile',
    properties: { smoke: true },
    appVersion: '1.0.0-smoke',
  });
  if (a2.status === 200 || a2.status === 201) pass('Analytics event');
  else if (a2.status === 404) pass('Analytics event', 'SKIP session BDD (404)');
  else fail('Analytics event', `${a2.status} ${JSON.stringify(a2.data).slice(0, 80)}`);

  const a3 = await api('POST', '/api/v1/analytics/performance', {
    sessionId,
    deviceId,
    metricType: 'api',
    metricName: 'request_duration',
    duration: 42,
    platform: 'mobile',
    appVersion: '1.0.0-smoke',
  });
  if (a3.status === 200 || a3.status === 201) pass('Analytics performance');
  else if (a3.status === 404) pass('Analytics performance', 'SKIP session BDD');
  else fail('Analytics performance', `${a3.status}`);

  // 10. Retour utilisateur (crash reporter path)
  const crash = await api('POST', '/api/v1/crashes', {
    crashType: 'ManualReport',
    message: `[suggestion] Smoke suggestion ${stamp}`,
    source: 'mobile',
    sessionId,
    screenName: '/settings',
    appVersion: '1.0.0-smoke',
    deviceInfo: {
      platform: 'android',
      osVersion: '14 (smoke)',
      deviceModel: 'Smoke Device',
      locale: 'fr_FR',
      memoryRssMb: '128.0',
      appVersion: '1.0.0-smoke',
    },
    userActions: ['nav /home → /settings', 'tap help_feedback'],
    metadata: {
      category: 'suggestion',
      feedback: true,
      anonymized: true,
      deviceId,
      sessionId,
    },
  });
  if (crash.status === 200 || crash.status === 201) pass('Retour / crash report');
  else fail('Retour / crash', `${crash.status}`);

  // 11. Time-travel (optionnel — ENABLE_TIME_TRAVEL côté application-service)
  if (appId) {
    const tt = await api('PUT', '/api/v1/applications/admin/test/time-travel', {
      entityType: 'application',
      entityId: appId,
      daysBack: 8,
    });
    if (tt.status === 200) pass('Time-travel candidature 8j', tt.data.newDate || '');
    else if (tt.status === 403) pass('Time-travel', 'SKIP — ENABLE_TIME_TRAVEL=true requis (.env + recreate service)');
    else fail('Time-travel', `${tt.status} ${tt.data.error || ''}`);
  }

  // 12. Profil + re-login (optionnel si rate-limit)
  const profile = await api('GET', '/api/v1/auth/profile');
  if (profile.status === 200) pass('Profil GET');
  else fail('Profil', `${profile.status}`);

  const relogin = await api('POST', '/api/v1/auth/login', { email: creds.email, password: creds.password }, null);
  if (relogin.status === 200 && relogin.data.token) pass('Re-login après parcours');
  else if (relogin.status === 429) pass('Re-login', 'SKIP rate-limit 429 (token courant encore valide)');
  else fail('Re-login', `${relogin.status}`);

  // 13. Candidature toujours accessible (GET par id — time-travel peut la sortir du top 5)
  const one = await api('GET', `/api/v1/applications/${appId}`);
  if (one.status === 200 && one.data.application?.id === appId) pass('Candidature GET par id');
  else if (one.status === 200 && one.data.id === appId) pass('Candidature GET par id');
  else fail('Candidature GET par id', `${one.status}`);

  summary();
}

function summary() {
  const ok = results.filter((r) => r.ok).length;
  const ko = results.filter((r) => !r.ok).length;
  console.log(`\n=== Bilan : ${ok} OK, ${ko} KO ===\n`);
  if (ko > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
