/**
 * Cible smoke mobile : candidature identifiée par poste + entreprise (nom exact UI).
 * Évite les faux positifs (« Postulé », « Jobbing », widgets voisins).
 */

const { GATEWAY_URL } = require('../lib/resolve-user-credentials');
const { loadRootEnv } = require('../lib/resolve-admin-credentials');
const adbLib = require('../../../tools/adb-lib');

loadRootEnv();

const SMOKE_POSITION_PREFIX = 'SmokeADB-';
const SMOKE_COMPANY_PREFIX = 'SmokeCoADB-';

const UI_EXCLUDE_SNIPPETS = [
  'JobbingTrack',
  'Open navigation',
  'Tab ',
  'Notifications',
  'Bonjour',
  'Candidatures',
  'Entreprises',
  'Contacts',
  'Rechercher',
  'Nouvelle candidature',
  'Créer ma première candidature',
  'Menu',
  'Se connecter',
  'Mot de passe',
];

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

function labelExcluded(label) {
  const l = String(label || '');
  return UI_EXCLUDE_SNIPPETS.some((s) => l.includes(s));
}

/** Poste (+ entreprise si fournie) — correspondance stricte sur le libellé UI. */
function matchesApplicationTarget(label, target) {
  const l = String(label || '');
  if (!target?.position || !l.includes(target.position)) return false;
  if (target.companyName && !l.includes(target.companyName)) return false;
  if (labelExcluded(l)) return false;
  return true;
}

function findApplicationCardNode(nodes, target) {
  if (!target?.position) return null;
  return (
    nodes.find(
      (n) =>
        n.clickable &&
        n.bounds &&
        matchesApplicationTarget(nodeLabel(n), target),
    ) || null
  );
}

function findCompanyCardNode(nodes, companyName) {
  if (!companyName) return null;
  return (
    nodes.find(
      (n) =>
        n.clickable &&
        n.bounds &&
        !labelExcluded(nodeLabel(n)) &&
        nodeLabel(n).includes(companyName),
    ) || null
  );
}

async function loginSmokeToken(email, password) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 200 || !data.token) {
    throw new Error(`Login smoke KO (${res.status})`);
  }
  return data.token;
}

async function listApplications(token) {
  const res = await fetch(`${GATEWAY_URL}/api/v1/applications?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GET applications HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return data.applications || data.data || [];
}

async function createSmokeApplication(token, stamp = Date.now()) {
  const position = `${SMOKE_POSITION_PREFIX}${stamp}`;
  const companyName = `${SMOKE_COMPANY_PREFIX}${stamp}`;
  const res = await fetch(`${GATEWAY_URL}/api/v1/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      position,
      companyName,
      contractType: 'CDI',
      applicationType: 'OFFRE',
      applicationDate: new Date().toISOString(),
      location: 'Paris',
      notes: 'Smoke ADB — cible nom exact',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `Création candidature smoke KO (${res.status}) ${JSON.stringify(data).slice(0, 120)}`,
    );
  }
  const app = data.application || data.data || data;
  return {
    id: app.id,
    position,
    companyName,
  };
}

/**
 * Réutilise la dernière candidature smoke (préfixe poste) ou en crée une.
 */
async function ensureSmokeApplication(token, { forceNew = false } = {}) {
  if (!forceNew) {
    const list = await listApplications(token);
    const existing = list
      .filter((a) => String(a.position || '').startsWith(SMOKE_POSITION_PREFIX))
      .sort((a, b) => String(b.id).localeCompare(String(a.id)))[0];
    if (existing) {
      return {
        id: existing.id,
        position: existing.position,
        companyName:
          existing.company?.name ||
          existing.companyName ||
          `${SMOKE_COMPANY_PREFIX}${existing.position.replace(SMOKE_POSITION_PREFIX, '')}`,
      };
    }
  }
  return createSmokeApplication(token);
}

async function ensureApplicationsListTab(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  const snap = await phone.uiSnapshot();
  if (snap.contains('Tab 1 of 5')) {
    await phone.tap('Tab 1 of 5');
  } else {
    await phone.tapXY(142, 585);
    await phone.wait(350);
    if ((await phone.uiSnapshot()).contains('Tab 1 of 5')) {
      await phone.tap('Tab 1 of 5');
    }
  }
  await phone.wait(600);
}

async function waitApplicationTargetVisible(phone, target, timeoutMs = 20000) {
  const state = await phone.waitUntil(({ nodes, contains }) => {
    if (contains('Impossible de charger les candidatures')) return 'error';
    if (findApplicationCardNode(nodes, target)) return 'list';
    if (
      contains('Aucune candidature') ||
      contains('Créer ma première candidature')
    ) {
      return 'empty';
    }
    return null;
  }, { timeoutMs, pollMs: 500 });
  return state || 'timeout';
}

async function tapApplicationCard(phone, target) {
  for (let i = 0; i < 8; i++) {
    const nodes = await phone.uiNodes();
    const card = findApplicationCardNode(nodes, target);
    if (card) {
      const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      await phone.tapXY(
        Math.floor((+m[1] + +m[3]) / 2),
        Math.floor((+m[2] + +m[4]) / 2),
      );
      return;
    }
    await phone.scrollDown(500);
    await phone.wait(700);
  }
  throw new Error(
    `Candidature « ${target.position} » (${target.companyName}) introuvable dans la liste`,
  );
}

async function refreshApplicationsList(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(800);
  await phone.scrollUp(950);
  await phone.wait(3000);
}

async function openSmokeApplicationDetail(phone, target) {
  await ensureApplicationsListTab(phone);
  await phone.wait(1200);
  let state = await waitApplicationTargetVisible(phone, target, 15000);
  if (state !== 'list') {
    await refreshApplicationsList(phone);
    state = await waitApplicationTargetVisible(phone, target, 20000);
  }
  if (state === 'empty') {
    throw new Error(
      `Liste vide — candidature smoke « ${target.position} » absente (pull-to-refresh ?)`,
    );
  }
  if (state === 'error') {
    throw new Error('Erreur chargement candidatures sur l’appareil');
  }
  if (state === 'timeout') {
    throw new Error(
      `Timeout : candidature « ${target.position} » non affichée`,
    );
  }
  await tapApplicationCard(phone, target);
  await phone.wait(900);
}

async function tapCompanyCard(phone, companyName) {
  for (let i = 0; i < 6; i++) {
    const card = findCompanyCardNode(await phone.uiNodes(), companyName);
    if (card) {
      const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      await phone.tapXY(
        Math.floor((+m[1] + +m[3]) / 2),
        Math.floor((+m[2] + +m[4]) / 2),
      );
      return;
    }
    await phone.scrollDown(450);
    await phone.wait(600);
  }
  throw new Error(`Entreprise « ${companyName} » introuvable dans la liste`);
}

module.exports = {
  SMOKE_POSITION_PREFIX,
  SMOKE_COMPANY_PREFIX,
  nodeLabel,
  matchesApplicationTarget,
  findApplicationCardNode,
  findCompanyCardNode,
  loginSmokeToken,
  ensureSmokeApplication,
  ensureApplicationsListTab,
  waitApplicationTargetVisible,
  tapApplicationCard,
  openSmokeApplicationDetail,
  tapCompanyCard,
};
