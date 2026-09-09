#!/usr/bin/env node
/**
 * MOB-NAV-01 — chaînes liées contact / relance + retours système.
 *
 * Parcours (depuis détail candidature) :
 *   → Contact lié → BACK → détail candidature
 *   → Relance liée → BACK → détail candidature
 *   → BACK → liste
 *
 *   SMOKE_USE_ADMIN=1 SMOKE_API_GATEWAY_URL=https://api.jobbingtrack.com \
 *   MOBILE_ADB_DEVICE=R5CT7263YJL ADB_FAST=1 \
 *   node scripts/mobile/smoke/adb/smoke-mobile-nav-contact-relance-back-adb.js
 */

const adbLib = require('../../../../tools/adb-lib');
require('../../lib/smoke-runtime');
const { ensureHomeTab } = require('../../lib/adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('../../lib/resolve-user-credentials');
const {
  loadRootEnv,
  resolveWorkingAdminCredentials,
  listAdminCredentialCandidates,
  getGatewayUrl,
} = require('../../lib/resolve-admin-credentials');
const {
  ensureSmokeApplication,
  loginSmokeToken,
  listApplications,
} = require('../../lib/smoke-application-target');

loadRootEnv();

async function resolveSmokeCredentials() {
  if (process.env.SMOKE_USE_ADMIN === '1') {
    try {
      return await resolveWorkingAdminCredentials();
    } catch (err) {
      console.warn('probe admin KO — fallback .env:', err.message);
      return listAdminCredentialCandidates()[0];
    }
  }
  try {
    return await resolveWorkingUserCredentials();
  } catch (err) {
    console.warn('TEST_USER KO — fallback ADMIN:', err.message);
    return resolveWorkingAdminCredentials();
  }
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

async function ensureLoggedIn(phone, email, password) {
  // Remonter piles détail → shell avant toute nav onglets
  for (let i = 0; i < 6; i++) {
    const shell =
      (await adbLib.flows.isShellVisible(phone)) ||
      (await phone.uiContains('Tab 1 of 4')) ||
      (await phone.uiContains('Tab 2 of 4'));
    if (shell && !(await phone.uiContains('Back'))) break;
    if (await phone.uiContains('Back')) {
      await phone.back();
      await phone.wait(600);
      continue;
    }
    break;
  }

  const already =
    (await adbLib.flows.isShellVisible(phone)) ||
    (await phone.uiContains('Bonjour')) ||
    (await phone.uiContains('Tab 2 of 4'));
  if (already) {
    await ensureHomeTab(phone);
    if (await phone.uiContains('Bonjour') || (await adbLib.flows.isShellVisible(phone))) {
      return;
    }
  }
  await phone.shellCommand(
    'am start -n com.example.jobbingtrack_mobile/.MainActivity',
  );
  await phone.wait(3500);
  await adbLib.flows.dismissBiometricUnlock(phone, { password });
  for (let i = 0; i < 4; i++) {
    if (await phone.uiContains('Back')) {
      await phone.back();
      await phone.wait(500);
    } else break;
  }
  if (await adbLib.flows.isShellVisible(phone)) {
    await ensureHomeTab(phone);
    return;
  }
  if (
    (await phone.uiContains('Se connecter')) ||
    (await phone.uiContains('Email')) ||
    (await phone.uiContains('Mot de passe'))
  ) {
    try {
      await adbLib.flows.loginFresh(phone, email, password);
    } catch (err) {
      console.warn('loginFresh KO:', err.message);
      await phone.typeInEditTextByIndex(0, email, { isEmail: true });
      await phone.typeInEditTextByIndex(1, password, { isPassword: true });
      await phone.enter();
      await phone.waitFor('Bonjour', 20000);
    }
  }
  await ensureHomeTab(phone);
  await phone.assertVisible('Bonjour');
}

async function openApplicationsList(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(1200);
  try {
    if (await phone.uiContains('Tab 1 of 6')) {
      await phone.tap('Tab 1 of 6');
      await phone.wait(800);
    }
  } catch {
    /* already */
  }
}

async function tapPreferredOrFirstApp(phone, preferredPosition) {
  const nodes = await phone.uiNodes();
  const exclude = [
    'Tab ',
    'Menu',
    'Actualiser',
    'Réessayer',
    'Ajouter',
    'Créer ma première',
    'Nouvelle candidature',
  ];
  const cards = nodes.filter((n) => {
    if (!n.clickable || !n.bounds) return false;
    const m = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) return false;
    const h = +m[4] - +m[2];
    const w = +m[3] - +m[1];
    if (h < 120 || w < 500 || +m[2] < 450) return false;
    const label = `${n.contentDesc || ''}\n${n.text || ''}`;
    return !exclude.some((s) => label.includes(s));
  });
  const card =
    (preferredPosition &&
      cards.find((n) =>
        `${n.contentDesc || ''}\n${n.text || ''}`.includes(preferredPosition),
      )) ||
    cards[0];
  if (!card) throw new Error('Aucune carte candidature');
  const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  console.log(
    '  carte:',
    (card.contentDesc || card.text || '').replace(/\n|&#10;/g, ' | ').slice(0, 80),
  );
  await phone.tapXY(
    Math.floor((+m[1] + +m[3]) / 2),
    Math.floor((+m[2] + +m[4]) / 2),
  );
  await phone.wait(2500);
}

/** Centre une cible (évite bottom bar) puis tape. */
async function tapLinkCentered(phone, matchFn) {
  for (let i = 0; i < 8; i++) {
    const nodes = await phone.uiNodes();
    const hit = nodes.find(matchFn);
    if (!hit?.bounds) {
      await phone.scrollDown(450);
      await phone.wait(400);
      continue;
    }
    const m = hit.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) return false;
    let cy = Math.floor((+m[2] + +m[4]) / 2);
    const cx = Math.floor((+m[1] + +m[3]) / 2);
    for (let j = 0; j < 5 && (cy < 700 || cy > 1450); j++) {
      if (cy > 1450) await phone.swipe(540, 1500, 540, 1050, 280);
      else await phone.swipe(540, 900, 540, 1350, 280);
      await phone.wait(300);
      const again = (await phone.uiNodes()).find(matchFn);
      if (!again?.bounds) break;
      const m2 = again.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!m2) break;
      cy = Math.floor((+m2[2] + +m2[4]) / 2);
    }
    await phone.shellCommand(`input tap ${cx} ${cy}`);
    await phone.wait(2200);
    return true;
  }
  return false;
}

async function ensureLinkedContactAndFollowUp(token, appId, companyId) {
  const base = getGatewayUrl();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const stamp = Date.now().toString().slice(-6);
  const contactRes = await fetch(`${base}/api/v1/contacts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      firstName: 'Nav',
      lastName: `Smoke${stamp}`,
      email: `nav.smoke${stamp}@example.com`,
      companyId: companyId || undefined,
      position: 'RH',
    }),
  });
  const contactJson = await contactRes.json().catch(() => ({}));
  if (!contactRes.ok) {
    throw new Error(
      `create contact KO ${contactRes.status} ${JSON.stringify(contactJson).slice(0, 160)}`,
    );
  }
  const contactId =
    contactJson.contact?.id || contactJson.data?.id || contactJson.id;
  if (contactId && appId) {
    await fetch(`${base}/api/v1/contacts/${contactId}/link-application`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ applicationId: appId }),
    }).catch(() => null);
  }
  const fuRes = await fetch(`${base}/api/v1/followups`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      applicationId: appId,
      followUpDate: new Date(Date.now() + 86400000).toISOString(),
      notes: `MOB-NAV smoke relance ${stamp}`,
      channel: 'EMAIL',
    }),
  });
  const fuJson = await fuRes.json().catch(() => ({}));
  if (!fuRes.ok) {
    throw new Error(
      `create followup KO ${fuRes.status} ${JSON.stringify(fuJson).slice(0, 160)}`,
    );
  }
  return {
    contactName: `Nav Smoke${stamp}`,
    followUpNote: `MOB-NAV smoke relance ${stamp}`,
  };
}

async function createRelanceViaFab(phone) {
  try {
    await phone.tap('Ajouter');
  } catch {
    const fab = await phone.findElement('Ajouter');
    if (!fab?.bounds) return false;
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(1500);
  if (!(await phone.uiContains('Relance'))) return false;
  await phone.tap('Relance');
  await phone.wait(2000);
  const open =
    (await phone.uiContains('Créer')) ||
    (await phone.uiContains('Date et heure'));
  if (!open) return false;
  try {
    await phone.tap('Créer');
  } catch {
    await phone.tapReliable('Créer');
  }
  await phone.wait(3500);
  return true;
}

async function createContactViaFab(phone) {
  try {
    await phone.tap('Ajouter');
  } catch {
    return false;
  }
  await phone.wait(1200);
  if (!(await phone.uiContains('Contact'))) return false;
  await phone.tap('Contact');
  await phone.wait(2000);
  // Picker / form — créer rapide si possible
  if (await phone.uiContains('Créer')) {
    try {
      await phone.tap('Créer un contact');
    } catch {
      try {
        await phone.tap('Créer');
      } catch {
        /* form fields */
      }
    }
    await phone.wait(1500);
  }
  const stamp = Date.now().toString().slice(-4);
  const edits = await phone.listEditTexts();
  if (edits.length >= 2) {
    await phone.typeInEditTextByIndex(0, 'Nav');
    await phone.typeInEditTextByIndex(1, `Ui${stamp}`);
  } else {
    try {
      await phone.typeInLabeledField('Prénom', 'Nav', { editIndex: 0 });
      await phone.typeInLabeledField('Nom', `Ui${stamp}`, { editIndex: 1 });
    } catch {
      return false;
    }
  }
  for (const label of ['Enregistrer', 'Créer', 'Ajouter']) {
    if (await phone.uiContains(label)) {
      try {
        await phone.tap(label);
        await phone.wait(3000);
        return true;
      } catch {
        /* next */
      }
    }
  }
  return false;
}

async function openLinkedUnderSection(phone, sectionLabel, exclude = []) {
  // Scroll until section visible
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains(sectionLabel)) break;
    await phone.scrollDown(500);
    await phone.wait(400);
  }
  if (!(await phone.uiContains(sectionLabel))) {
    return false;
  }
  const opened = await tapLinkCentered(phone, (n) => {
    if (!n.clickable || !n.bounds) return false;
    const d = `${n.contentDesc || ''}\n${n.text || ''}`.replace(/&#10;/g, '\n');
    if (d.includes('Tab ') || d.includes('Ajouter') || d.includes('Back')) return false;
    if (d === sectionLabel || d.startsWith(`${sectionLabel}\n`)) return false;
    if (exclude.some((e) => d.includes(e))) return false;
    // Empty-state lines
    if (/Aucun|Aucune/.test(d)) return false;
    const m = n.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!m) return false;
    const y1 = +m[2];
    // Prefer tiles below ~ mid content
    return y1 > 500 && d.length > 2;
  });
  return opened;
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

  let target = null;
  let links = null;
  try {
    const token = await loginSmokeToken(email, password);
    const apps = await listApplications(token);
    // Préférer une candidature déjà présente sur le device (ex. SRE/OVH cache Samsung)
    const preferred =
      apps.find((a) => /SRE|OVHcloud|OVH/i.test(`${a.position || ''} ${a.company?.name || a.companyName || ''}`)) ||
      apps.find((a) => String(a.position || '').startsWith('SmokeADB-')) ||
      apps[0];
    if (!preferred) throw new Error('Aucune candidature API');
    target = {
      id: preferred.id,
      position: preferred.position,
      companyName: preferred.company?.name || preferred.companyName,
    };
    const companyId = preferred.companyId || preferred.company?.id;
    links = await ensureLinkedContactAndFollowUp(token, preferred.id, companyId);
    console.log('Cible:', target.position, '/', target.companyName);
    console.log('Liens API:', links.contactName, '/', links.followUpNote);
  } catch (err) {
    console.warn('Seed API liens skip:', err.message);
  }

  await ensureLoggedIn(phone, email, password);
  await openApplicationsList(phone);
  // Sync pour voir contact/relance API (sinon cache offline Samsung)
  for (const label of ['Réessayer', 'Actualiser']) {
    if (await phone.uiContains(label)) {
      try {
        await phone.tap(label);
        await phone.wait(3500);
      } catch {
        /* ignore */
      }
    }
  }
  await phone.swipe(540, 800, 540, 1500, 400);
  await phone.wait(2500);

  // Cible smoke si visible, sinon 1ère carte — mais on exige les liens ensuite
  let openedPreferred = false;
  if (target?.position) {
    try {
      await tapPreferredOrFirstApp(phone, target.position);
      openedPreferred = await onApplicationDetail(phone);
    } catch {
      openedPreferred = false;
    }
  }
  if (!openedPreferred) {
    await openApplicationsList(phone);
    await tapPreferredOrFirstApp(phone, null);
  }
  if (!(await onApplicationDetail(phone))) {
    throw new Error('Détail candidature introuvable');
  }
  console.log('✅ Liste → détail candidature');

  // Si pas de liens : créer via FAB (device hors-ligne / 429 API)
  let emptyContact = await phone.uiContains('Aucun contact lié');
  let emptyRelance = await phone.uiContains('Aucune relance');
  if (emptyContact || emptyRelance) {
    for (let i = 0; i < 5; i++) {
      if (await phone.uiContains('Aucun contact') || await phone.uiContains('Aucune relance')) break;
      await phone.scrollDown(400);
      await phone.wait(300);
    }
    emptyContact = await phone.uiContains('Aucun contact lié');
    emptyRelance = await phone.uiContains('Aucune relance');
  }
  if (emptyRelance) {
    console.warn('Aucune relance — création FAB');
    const ok = await createRelanceViaFab(phone);
    if (!ok) throw new Error('Création relance FAB KO');
    console.log('✅ Relance créée via FAB');
    // revenir au détail si le sheet a navigué
    if (!(await onApplicationDetail(phone))) {
      await phone.back();
      await phone.wait(1200);
    }
  }
  if (emptyContact) {
    console.warn('Aucun contact — création FAB');
    const ok = await createContactViaFab(phone);
    if (!ok) {
      console.warn('Création contact FAB KO — on tentera quand même la relance nested-back');
    } else {
      console.log('✅ Contact créé via FAB');
      if (!(await onApplicationDetail(phone))) {
        await phone.back();
        await phone.wait(1200);
      }
    }
  }

  // ── Contact (optionnel si création KO)
  let contactOpened = await openLinkedUnderSection(phone, 'Contacts', [
    'Relances',
    'Entretiens',
    'Appels',
    'Entreprise',
    'Résultat',
  ]);
  if (!contactOpened && links?.contactName) {
    contactOpened = await tapLinkCentered(phone, (n) => {
      if (!n.clickable || !n.bounds) return false;
      const d = `${n.contentDesc || ''}\n${n.text || ''}`;
      return d.includes('Nav Smoke') || d.includes(links.contactName) || d.includes('Nav Ui');
    });
  }

  if (contactOpened) {
    const onContact =
      (await phone.uiContains('Candidatures liées')) ||
      (await phone.uiContains('Entreprises liées')) ||
      ((await phone.uiContains('Back')) &&
        (await phone.uiContains('Modifier')) &&
        !(await onApplicationDetail(phone)));
    if (!onContact && (await onApplicationDetail(phone))) {
      throw new Error('Tap contact : toujours sur détail candidature');
    }
    console.log('✅ Détail candidature → contact');
    await phone.back();
    await phone.wait(1800);
    if (!(await onApplicationDetail(phone))) {
      throw new Error('BACK contact : attendu détail candidature');
    }
    console.log('✅ BACK contact → détail candidature');
  } else {
    console.warn('⚠️ Chaîne contact skip (pas de contact lié)');
  }
  // ── Relance
  let relanceOpened = false;
  for (let i = 0; i < 8; i++) {
    if (await phone.uiContains('Relances')) break;
    await phone.scrollDown(450);
    await phone.wait(350);
  }
  if (links?.followUpNote) {
    relanceOpened = await tapLinkCentered(phone, (n) => {
      if (!n.clickable || !n.bounds) return false;
      const d = `${n.contentDesc || ''}\n${n.text || ''}`;
      return (
        d.includes('MOB-NAV smoke relance') ||
        d.includes(links.followUpNote) ||
        d.includes('Email') ||
        d.includes('relance')
      );
    });
  }
  if (!relanceOpened) {
    relanceOpened = await openLinkedUnderSection(phone, 'Relances', [
      'Contacts',
      'Entretiens',
      'Appels',
      'Entreprise',
      'Aucun',
    ]);
  }
  if (!relanceOpened) {
    throw new Error('Impossible d’ouvrir une relance liée depuis le détail');
  }
  const onRelance =
    (await phone.uiContains('Candidature liée')) ||
    ((await phone.uiContains('Back')) &&
      (await phone.uiContains('Modifier')) &&
      !(await onApplicationDetail(phone)));
  if (!onRelance && (await onApplicationDetail(phone))) {
    throw new Error('Tap relance : toujours sur détail candidature');
  }
  console.log('✅ Détail candidature → relance');
  await phone.back();
  await phone.wait(1800);
  if (!(await onApplicationDetail(phone))) {
    throw new Error('BACK relance : attendu détail candidature');
  }
  console.log('✅ BACK relance → détail candidature');

  await phone.back();
  await phone.wait(1800);
  if (!(await onApplicationsList(phone))) {
    throw new Error('BACK détail : attendu liste candidatures');
  }
  console.log('✅ BACK détail → liste candidatures');

  console.log('\nSmoke MOB-NAV contact/relance back OK');
})().catch((err) => {
  console.error('Smoke MOB-NAV contact/relance back KO:', err.message);
  process.exit(1);
});
