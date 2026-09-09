#!/usr/bin/env node
/**
 * MOB-NAV-01 — chaîne détail liée + retours système (UI only, sans créer de data API).
 *
 * Parcours :
 *   Accueil → Candidatures → 1ère carte → Entreprise → BACK → détail → BACK → liste
 *
 *   SMOKE_API_GATEWAY_URL=https://api.jobbingtrack.com \
 *   DEVICE_SERIAL=R5CT7263YJL \
 *   node scripts/mobile/smoke/adb/smoke-mobile-nav-nested-back-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const { ensureHomeTab } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const {
  loadRootEnv,
  resolveWorkingAdminCredentials,
} = require('../../lib/resolve-admin-credentials');
const {
  ensureSmokeApplication,
  loginSmokeToken,
  waitApplicationTargetVisible,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function resolveSmokeCredentials() {
  if (process.env.SMOKE_USE_ADMIN === '1') {
    return resolveWorkingAdminCredentials();
  }
  try {
    return await resolveWorkingUserCredentials();
  } catch (err) {
    console.warn('TEST_USER KO — fallback ADMIN:', err.message);
    return resolveWorkingAdminCredentials();
  }
}

async function dismissOpenSheets(phone) {
  for (let i = 0; i < 3; i++) {
    const snap = await phone.uiSnapshot(true);
    const sheetOpen =
      snap.contains('Fermer') ||
      snap.contains('Dismiss') ||
      (snap.contains('Nouvelle candidature') &&
        (snap.contains('Entreprise *') || snap.contains('Choisir ou créer')));
    if (!sheetOpen) break;
    try {
      if (snap.contains('Fermer')) await phone.tap('Fermer');
      else if (snap.contains('Dismiss')) await phone.tap('Dismiss');
      else await phone.back();
    } catch {
      await phone.back();
    }
    await phone.wait(800);
  }
}

/** Si liste en erreur 429 / réseau — attendre et Réessayer. */
async function recoverApplicationsListLoad(phone, { maxAttempts = 4 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const snap = await phone.uiSnapshot(true);
    const blocked =
      snap.contains('Impossible de charger') ||
      snap.contains('Erreur HTTP 429') ||
      snap.contains('Trop de requêtes') ||
      (snap.contains('Erreur réseau') && snap.contains('Réessayer'));
    if (!blocked) return false;
    const waitMs = 20000 + i * 15000;
    console.warn(`[smoke] liste candidatures en erreur réseau — pause ${Math.round(waitMs / 1000)}s puis Réessayer`);
    await phone.wait(waitMs);
    try {
      await phone.tap('Réessayer');
    } catch {
      try {
        await phone.tap('Actualiser');
      } catch {
        await phone.swipe(540, 700, 540, 1500, 500);
      }
    }
    await phone.wait(3500);
  }
  return true;
}

async function ensureLoggedIn(phone, email, password) {
  // Release APK : pas de prefs run-as — session déjà ouverte si possible.
  const alreadyInApp =
    (await adbLib.flows.isShellVisible(phone)) ||
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 1 of 4')) ||
    (await phone.uiContains('Tab 2 of 4')) ||
    (await onApplicationDetail(phone)) ||
    ((await phone.uiContains('Back')) && (await phone.uiContains('Modifier')));
  if (alreadyInApp) {
    if (await onApplicationDetail(phone) || ((await phone.uiContains('Back')) && (await phone.uiContains('Nom')))) {
      // Remonter au shell pour un parcours propre
      for (let i = 0; i < 4; i++) {
        if (await adbLib.flows.isShellVisible(phone)) break;
        await phone.back();
        await phone.wait(700);
      }
    }
    await ensureHomeTab(phone);
    if (await phone.uiContains('Bonjour') || (await adbLib.flows.isShellVisible(phone))) return;
  }
  try {
    await phone.shellCommand(
      'am start -n com.example.jobbingtrack_mobile/.MainActivity',
    );
  } catch {
    await adbLib.flows.restartApp(phone);
  }
  await phone.wait(3500);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (await adbLib.flows.isShellVisible(phone)) {
    await ensureHomeTab(phone);
    return;
  }
  if (await phone.uiContains('Connexion ADMIN')) {
    await phone.tap('Connexion ADMIN');
    await phone.wait(2500);
  } else if (await phone.uiContains('Connexion USER')) {
    await phone.tap('Connexion USER');
    await phone.wait(2500);
  }
  const onLogin =
    (await phone.uiContains('Se connecter')) ||
    (await phone.uiContains('Email')) ||
    (await phone.uiContains('Mot de passe')) ||
    (await phone.uiContains('JobbingTrack'));
  if (onLogin && !(await adbLib.flows.isShellVisible(phone))) {
    // Blackview / release : labels souvent en content-desc seulement ;
    // clavier Gboard masque « Se connecter » — saisie index + ENTER.
    try {
      await adbLib.flows.loginFresh(phone, email, password);
    } catch (err) {
      console.warn('loginFresh KO, fallback EditText+ENTER:', err.message);
      const edits = await phone.listEditTexts();
      if (edits.length >= 2) {
        await phone.typeInEditTextByIndex(0, email, { isEmail: true });
        await phone.typeInEditTextByIndex(1, password, { isPassword: true });
        await phone.enter();
      } else {
        throw err;
      }
    }
  }
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  if (!(await phone.uiContains('Bonjour'))) {
    await ensureHomeTab(phone);
  }
  await phone.assertVisible('Bonjour');
}

async function onApplicationDetail(phone) {
  return (
    (await phone.uiContains('Résultat / statut')) ||
    (await phone.uiContains('Changer statut')) ||
    ((await phone.uiContains('Ajouter')) &&
      ((await phone.uiContains('Contacts')) ||
        (await phone.uiContains('Relances')) ||
        (await phone.uiContains('Entreprise'))))
  );
}

async function onApplicationsList(phone) {
  const listChrome =
    (await phone.uiContains('Tab 1 of 6')) ||
    ((await phone.uiContains('Candidatures')) &&
      (await phone.uiContains('Entreprises')));
  return listChrome && !(await onApplicationDetail(phone));
}

async function openApplicationsList(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(1500);
  // Sous-onglet Candidatures (index 0)
  try {
    if (await phone.uiContains('Tab 1 of 6')) {
      await phone.tap('Tab 1 of 6');
      await phone.wait(800);
    }
  } catch {
    /* already */
  }
}

async function tapFirstApplicationCard(phone, preferredPosition) {
  const nodes = await phone.uiNodes();
  const exclude = [
    'Tab ',
    'Menu',
    'Actualiser',
    'Réessayer',
    'Ajouter',
    'Archiver',
    'Modifier',
    'Corbeille',
    'Rechercher',
    'Filtrer',
    'Créer ma première candidature',
    'Nouvelle candidature',
    'Fermer',
    'Dismiss',
  ];
  const candidates = nodes.filter((n) => {
    if (!n.clickable || !n.bounds) return false;
    const m = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) return false;
    const y1 = +m[2];
    const y2 = +m[4];
    const x1 = +m[1];
    const x2 = +m[3];
    const h = y2 - y1;
    const w = x2 - x1;
    if (h < 120 || w < 500 || y1 < 450) return false;
    const label = `${n.contentDesc || ''}\n${n.text || ''}`;
    return !exclude.some((s) => label.includes(s));
  });
  const card =
    (preferredPosition &&
      candidates.find((n) =>
        `${n.contentDesc || ''}\n${n.text || ''}`.includes(preferredPosition),
      )) ||
    candidates[0];
  if (!card) throw new Error('Aucune carte candidature cliquable dans la liste');
  const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  const label = (card.contentDesc || card.text || '').replace(/\n/g, ' | ').slice(0, 80);
  console.log('  carte:', label || '(sans label)');
  await phone.tapXY(
    Math.floor((+m[1] + +m[3]) / 2),
    Math.floor((+m[2] + +m[4]) / 2),
  );
  await phone.wait(2500);
}

async function openCompanyFromDetail(phone, companyName) {
  const decode = (s) =>
    String(s || '')
      .replace(/&#10;/g, '\n')
      .replace(/&amp;/g, '&');

  const midY = async (bounds) => {
    const m = String(bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) return null;
    return {
      cx: Math.floor((+m[1] + +m[3]) / 2),
      cy: Math.floor((+m[2] + +m[4]) / 2),
      y1: +m[2],
      y2: +m[4],
    };
  };

  /** Blackview : taps près de la bottom bar (~y>1500) sont mangés — centrer la cible. */
  const tapCentered = async (bounds) => {
    let geo = await midY(bounds);
    if (!geo) return false;
    for (let i = 0; i < 6 && (geo.cy < 700 || geo.cy > 1450); i++) {
      if (geo.cy > 1450) await phone.swipe(540, 1500, 540, 1050, 280);
      else await phone.swipe(540, 900, 540, 1350, 280);
      await phone.wait(350);
      const nodes = await phone.uiNodes();
      const again =
        (companyName &&
          nodes.find(
            (n) =>
              n.clickable &&
              decode(n.contentDesc || '').includes(companyName) &&
              !decode(n.contentDesc || '').includes('\n'),
          )) ||
        nodes.find((n) => n.clickable && decode(n.contentDesc || '') === 'Entreprise');
      if (again?.bounds) geo = (await midY(again.bounds)) || geo;
      else break;
    }
    await phone.shellCommand(`input tap ${geo.cx} ${geo.cy}`);
    await phone.wait(2200);
    return !(await onApplicationDetail(phone));
  };

  for (let scroll = 0; scroll < 5; scroll++) {
    const nodes = await phone.uiNodes();

    // Ligne entreprise clickable (pas le hero multi-ligne)
    if (companyName) {
      const row = nodes.find((n) => {
        if (!n.clickable || !n.bounds) return false;
        const d = decode(n.contentDesc || '');
        return d === companyName || (d.includes(companyName) && !d.includes('\n'));
      });
      if (row && (await tapCentered(row.bounds))) return true;
    }

    const entrepriseHeader = nodes.find(
      (n) => n.clickable && decode(n.contentDesc || '') === 'Entreprise',
    );
    if (entrepriseHeader && (await tapCentered(entrepriseHeader.bounds))) return true;

    const companyHit = nodes.find((n) => {
      if (!n.clickable || !n.bounds) return false;
      const d = decode(n.contentDesc || '');
      return d === 'Entreprise' || d.startsWith('Entreprise\n');
    });
    if (companyHit && (await tapCentered(companyHit.bounds))) return true;

    await phone.scrollDown(500);
    await phone.wait(500);
  }
  return false;
}

(async () => {
  const { email, password } = await resolveSmokeCredentials();
  const phone = await adbLib.connect(
    process.env.MOBILE_ADB_DEVICE ||
      process.env.ADB_DEVICE_ID ||
      process.env.DEVICE_SERIAL ||
      undefined,
  );
  console.log('Device:', phone.deviceId);
  console.log('User:', email);

  let smokeTarget = null;
  const skipApiSeed = ['1', 'true', 'yes'].includes(
    String(process.env.SMOKE_SKIP_CREDENTIAL_PROBE || '').toLowerCase(),
  );
  if (!skipApiSeed) {
    try {
      const token = await loginSmokeToken(email, password);
      smokeTarget = await ensureSmokeApplication(token);
      console.log('Cible API:', smokeTarget.position, '/', smokeTarget.companyName);
    } catch (err) {
      console.warn('Seed API candidature skip:', err.message);
    }
  } else {
    console.log('Seed API skip (SMOKE_SKIP_CREDENTIAL_PROBE)');
  }

  await ensureLoggedIn(phone, email, password);
  await dismissOpenSheets(phone);
  await openApplicationsList(phone);
  await dismissOpenSheets(phone);
  await recoverApplicationsListLoad(phone);
  if (smokeTarget?.position) {
    try {
      await waitApplicationTargetVisible(phone, smokeTarget, 25000);
    } catch (err) {
      console.warn('Attente cible UI:', err.message);
      try {
        await phone.tap('Actualiser');
        await phone.wait(2500);
      } catch {
        await phone.swipe(540, 900, 540, 1600, 400);
        await phone.wait(2500);
      }
    }
  }
  if (!(await onApplicationsList(phone)) && !(await phone.uiContains('Candidatures'))) {
    throw new Error('Liste candidatures introuvable');
  }
  console.log('✅ Onglet candidatures');

  await tapFirstApplicationCard(phone, smokeTarget?.position);
  if (!(await onApplicationDetail(phone))) {
    throw new Error('Détail candidature introuvable après tap liste');
  }
  console.log('✅ Liste → détail candidature');

  let companyHint = smokeTarget?.companyName || null;
  if (!companyHint) {
    const nodes = await phone.uiNodes();
    const hero = nodes.find((n) => {
      const d = String(n.contentDesc || '').replace(/&#10;/g, '\n');
      return d.includes('\n') && n.bounds && /\[(\d+),(\d+)\]/.test(n.bounds);
    });
    if (hero) {
      companyHint = String(hero.contentDesc || '')
        .replace(/&#10;/g, '\n')
        .split('\n')[0]
        .trim();
    }
  }
  const opened = await openCompanyFromDetail(phone, companyHint);
  if (!opened) {
    throw new Error('Impossible d’ouvrir l’entreprise depuis le détail');
  }
  console.log('✅ Détail candidature → entreprise');

  await phone.back();
  await phone.wait(1800);
  if (!(await onApplicationDetail(phone))) {
    throw new Error('BACK entreprise : attendu détail candidature');
  }
  console.log('✅ BACK entreprise → détail candidature');

  await phone.back();
  await phone.wait(1800);
  if (!(await onApplicationsList(phone))) {
    throw new Error('BACK détail : attendu liste candidatures');
  }
  console.log('✅ BACK détail → liste candidatures');

  console.log('\nSmoke MOB-NAV nested back OK');
})().catch((err) => {
  console.error('Smoke MOB-NAV nested back KO:', err.message);
  process.exit(1);
});
