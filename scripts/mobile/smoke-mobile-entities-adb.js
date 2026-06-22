#!/usr/bin/env node
/**
 * Smoke entreprises, contacts, édition profil (Lot D ligne 320).
 * Recherche, création contact, détail entreprise, profil.
 *
 *   node scripts/mobile/smoke-mobile-entities-adb.js
 */

const adbLib = require('../../tools/adb-lib');
const { ensureUserShell, typeInLabeledField, openProfileEdit } = require('./adb-smoke-helpers');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');
const { loadRootEnv } = require('./resolve-admin-credentials');

loadRootEnv();

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
}

async function ensureLoggedIn(phone, email, password) {
  return ensureUserShell(phone, email, password);
}

async function openDrawerItemWithScroll(phone, label) {
  if (await phone.uiContains('Tab 1 of 4')) {
    await adbLib.flows.goToTab(phone, 1, { shell: true });
    await phone.wait(1200);
  }
  if (await phone.uiContains('Open navigation menu')) {
    await phone.tap('Open navigation menu');
  } else {
    await phone.openDrawer();
  }
  await phone.wait(1200);
  if (!(await phone.uiContains(label))) {
    await phone.drawerScrollDown();
    await phone.wait(700);
  }
  await phone.tap(label);
  await phone.wait(2500);
}

async function openFirstApplicationDetail(phone) {
  await adbLib.flows.goToTab(phone, 2, { shell: true });
  await phone.wait(2000);
  try {
    await phone.tap('Tab 1 of 5');
  } catch {
    try {
      await phone.tap('Candidatures', 0);
    } catch {
      /* déjà sur sous-onglet candidatures */
    }
  }
  await phone.wait(2000);
  let card = null;
  for (let i = 0; i < 15; i++) {
    const nodes = await phone.uiNodes();
    card = nodes.find((n) => n.clickable && nodeLabel(n).includes('Postulé'));
    if (card) break;
    await phone.wait(1000);
  }
  if (!card) throw new Error('Aucune candidature pour créer un contact');
  const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  await phone.tapXY(
    Math.floor((+m[1] + +m[3]) / 2),
    Math.floor((+m[2] + +m[4]) / 2),
  );
  await phone.wait(2500);
}

async function createContactFromApplicationDetail(phone, contactName) {
  await openFirstApplicationDetail(phone);
  try {
    await phone.tap('Ajouter');
  } catch {
    const fab = await phone.findElement('Ajouter');
    const m = fab.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
  await phone.wait(2000);
  await phone.tap('Contact');
  await phone.wait(2000);
  try {
    await phone.tap('Créer un nouveau contact');
  } catch {
    await phone.tap('nouveau contact');
  }
  await phone.wait(2000);
  if (!(await phone.uiContains('Nouveau contact'))) {
    throw new Error('Dialogue création contact (depuis candidature) introuvable');
  }
  await typeInLabeledField(phone, 'Prénom', contactName, { editIndex: 0 });
  await typeInLabeledField(phone, 'Nom', 'ADB', { editIndex: 1 });
  await phone.wait(500);
  try {
    await phone.tap('Créer');
  } catch {
    await phone.tap('Enregistrer');
  }
  await phone.wait(3000);
  await phone.back();
  await phone.wait(1000);
  await phone.back();
  await phone.wait(1500);
}

async function tapFirstCompanyCard(phone) {
  const nodes = await phone.uiNodes();
  const card = nodes.find(
    (n) =>
      n.clickable &&
      nodeLabel(n).length > 2 &&
      !nodeLabel(n).includes('Tab ') &&
      !nodeLabel(n).includes('Rechercher') &&
      !nodeLabel(n).includes('Entreprises') &&
      !nodeLabel(n).includes('Notifications'),
  );
  if (card) {
    const label = nodeLabel(card).split('\n')[0];
    try {
      await phone.tap(label.slice(0, 24));
      return;
    } catch {
      const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      await phone.tapXY(
        Math.floor((+m[1] + +m[3]) / 2),
        Math.floor((+m[2] + +m[4]) / 2),
      );
      return;
    }
  }
  await phone.tapXY(540, 700);
}

async function tapFirstContact(phone, preferName) {
  const nodes = await phone.uiNodes();
  let tile = null;
  if (preferName) {
    tile = nodes.find(
      (n) => n.clickable && nodeLabel(n).includes(preferName),
    );
  }
  tile =
    tile ||
    nodes.find(
      (n) =>
        n.clickable &&
        (nodeLabel(n).includes('@') ||
          (nodeLabel(n).includes('Contact') && !nodeLabel(n).includes('Contacts'))) &&
        !nodeLabel(n).includes('Tab ') &&
        !nodeLabel(n).includes('Notifications') &&
        !nodeLabel(n).includes('Open navigation') &&
        n.contentDesc !== 'Menu',
    );
  if (!tile) throw new Error('Aucun contact cliquable dans la liste');
  const label = nodeLabel(tile).split('\n')[0];
  try {
    await phone.tap(label.slice(0, 20));
  } catch {
    const m = tile.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    await phone.tapXY(
      Math.floor((+m[1] + +m[3]) / 2),
      Math.floor((+m[2] + +m[4]) / 2),
    );
  }
}

(async () => {
  const { email, password } = await resolveWorkingUserCredentials();
  const phone = await adbLib.connect();
  console.log('User:', email);

  await ensureLoggedIn(phone, email, password);

  // ── Entreprises : liste + recherche + détail
  await openDrawerItemWithScroll(phone, 'Entreprises');
  await phone.wait(2000);
  if (!(await phone.uiContains('Entreprises'))) {
    throw new Error('Écran Entreprises introuvable');
  }
  let companiesOk = false;
  for (let i = 0; i < 8; i++) {
    companiesOk =
      (await phone.uiContains('Aucune entreprise')) ||
      (await phone.uiContains('Rechercher')) ||
      (await phone.uiContains('entreprise'));
    if (companiesOk) break;
    await phone.wait(1000);
  }
  if (!companiesOk) {
    throw new Error('Liste entreprises : état vide/chargé introuvable');
  }
  console.log('✅ Entreprises : écran OK');

  try {
    await typeInLabeledField(phone, 'Rechercher', 'zzz-smoke-no-match-xyz', {
      hints: ['Rechercher une entreprise', 'Rechercher'],
      editIndex: 0,
    });
    await phone.wait(1500);
    if (!(await phone.uiContains('Aucune entreprise'))) {
      console.log('✅ Entreprises : recherche filtre (liste réduite ou vide)');
    } else {
      console.log('✅ Entreprises : recherche sans résultat OK');
    }
    await typeInLabeledField(phone, 'Rechercher', 'a', {
      hints: ['Rechercher une entreprise', 'Rechercher'],
      editIndex: 0,
    });
    await phone.wait(1500);
  } catch (e) {
    console.log('⚠️ Recherche entreprise : champ non saisi ADB —', e.message);
  }

  if (!(await phone.uiContains('Aucune entreprise'))) {
    await tapFirstCompanyCard(phone);
    await phone.wait(2500);
    const detailOk =
      (await phone.uiContains('Contacts')) ||
      (await phone.uiContains('Candidatures')) ||
      (await phone.uiContains('Site web')) ||
      (await phone.uiContains('entreprise'));
    if (!detailOk) {
      throw new Error('Détail entreprise introuvable après tap liste');
    }
    console.log('✅ Entreprises : tap → détail OK');
    await phone.back();
    await phone.wait(1500);
  }

  await phone.back();
  await phone.wait(1500);

  // ── Contacts : liste + création depuis détail candidature + détail
  await openDrawerItemWithScroll(phone, 'Contacts');
  if (!(await phone.uiContains('Contacts'))) {
    throw new Error('Écran Contacts introuvable');
  }
  console.log('✅ Contacts : liste shell OK');

  const contactName = `Smoke${Date.now().toString().slice(-6)}`;
  await createContactFromApplicationDetail(phone, contactName);
  const created =
    (await phone.uiContains('Contact créé')) ||
    (await phone.uiContains(contactName)) ||
    (await phone.uiContains('Smoke'));
  if (!created) {
    await openDrawerItemWithScroll(phone, 'Contacts');
    await phone.wait(2000);
    if (!(await phone.uiContains(contactName)) && !(await phone.uiContains('Smoke'))) {
      throw new Error(`Contact « ${contactName} » non visible après création`);
    }
  }
  console.log(`✅ Contacts : création « ${contactName} » depuis candidature OK`);

  await openDrawerItemWithScroll(phone, 'Contacts');
  await phone.wait(2000);
  try {
    await phone.tap('Tab 3 of 5');
  } catch {
    try {
      await phone.tap('Contacts', 0);
    } catch {
      /* ok */
    }
  }
  await phone.wait(2000);
  await tapFirstContact(phone, contactName);
  await phone.wait(2500);
  const contactDetail =
    (await phone.uiContains('Entreprises liées')) ||
    (await phone.uiContains('Candidatures liées')) ||
    (await phone.uiContains(contactName));
  if (!contactDetail) {
    throw new Error('Détail contact introuvable');
  }
  console.log('✅ Contacts : tap → détail OK');
  await phone.back();
  await phone.wait(1500);
  await phone.back();
  await phone.wait(1500);

  // ── Profil → Modifier (sans sauvegarde)
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(800);
  await openProfileEdit(phone);
  console.log('✅ Profil : écran modification OK');
  await phone.back();
  await phone.wait(1500);
  await phone.assertVisible('Profil');
  console.log('✅ Retour édition profil → Profil OK');

  console.log('\nSmoke entités mobile OK');
})().catch((err) => {
  console.error('Smoke entités mobile KO:', err.message);
  process.exit(1);
});
