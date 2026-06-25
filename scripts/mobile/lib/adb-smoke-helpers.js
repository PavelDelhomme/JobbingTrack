/**
 * Helpers partagés smokes ADB — session shell réutilisée, champs labelText Flutter.
 */

const adbLib = require('../../../tools/adb-lib');
const smokeApp = require('../lib/smoke-application-target');

function nodeLabel(n) {
  return smokeApp.nodeLabel(n);
}

/** Connexion sans restart si le shell est déjà visible. */
async function ensureUserShell(phone, email, password) {
  return adbLib.flows.ensureAuthenticatedShell(phone, email, password);
}

async function openProfileEdit(phone) {
  await adbLib.flows.goToTab(phone, 4, { shell: true });
  await phone.wait(800);
  let opened = false;
  // Icône crayon AppBar (tooltip « Modifier ») — plus fiable que le ListTile sur émulateur
  if (await phone.uiContains('Modifier')) {
    try {
      const nodes = await phone.uiNodes();
      const editBtn = nodes.find(
        (n) =>
          n.clickable &&
          (n.contentDesc === 'Modifier' || n.text === 'Modifier') &&
          !`${n.text || ''}${n.contentDesc || ''}`.includes('profil'),
      );
      if (editBtn?.bounds) {
        const m = editBtn.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (m) {
          await phone.tapXY(
            Math.round((+m[1] + +m[3]) / 2),
            Math.round((+m[2] + +m[4]) / 2),
          );
          opened = true;
        }
      }
    } catch {
      /* fallback list tile */
    }
  }
  if (!opened) {
    for (const label of ['Modifier le profil', 'Modifier', 'Edit profile']) {
      if (!(await phone.uiContains(label))) continue;
      try {
        await phone.tapReliable(label);
        opened = true;
        break;
      } catch {
        /* label suivant */
      }
    }
  }
  if (!opened) {
    throw new Error('Bouton modification profil introuvable');
  }
  const editVisible = ({ contains, nodes }) =>
    contains('Enregistrer') ||
    contains('Sauvegarder') ||
    (contains('Email') && (contains('Prénom') || contains('Nom'))) ||
    nodes.some(
      (n) =>
        n.className.includes('EditText') &&
        ((n.text || '').length > 0 || (n.contentDesc || '').includes('Prénom')),
    );
  let ok = await phone.waitUntil(editVisible, { timeoutMs: 20000, pollMs: 500 });
  if (!ok) {
    await phone.scrollDown(600);
    await phone.wait(800);
    ok = await phone.waitUntil(editVisible, { timeoutMs: 12000, pollMs: 500 });
  }
  if (!ok && (await phone.uiContains('Enregistrer'))) {
    ok = true;
  }
  if (!ok) {
    throw new Error('Écran modification profil introuvable');
  }
}

async function openAppDrawer(phone) {
  const onShell =
    (await phone.uiContains('Bonjour')) ||
    (await adbLib.flows.isShellVisible(phone));
  if (onShell) {
    try {
      await adbLib.flows.goToTab(phone, 1, { shell: true });
      await phone.wait(800);
    } catch {
      /* déjà sur accueil ou onglets absents du dump émulateur */
    }
  }
  await phone.openNavigationDrawer();
  await phone.wait(1000);
}

async function typeInLabeledField(phone, label, value, opts = {}) {
  return phone.typeInLabeledField(label, value, opts);
}

/** Onglet Candidatures (Tab 1/5), pas Entreprises après navigation Profil/Paramètres. */
async function ensureApplicationsListTab(phone) {
  return smokeApp.ensureApplicationsListTab(phone);
}

async function waitApplicationsTabReady(phone, target, timeoutMs = 12000) {
  if (!target?.position) {
    throw new Error('waitApplicationsTabReady : target.position requis (nom exact poste)');
  }
  return smokeApp.waitApplicationTargetVisible(phone, target, timeoutMs);
}

async function openSmokeApplicationDetail(phone, target) {
  return smokeApp.openSmokeApplicationDetail(phone, target);
}

module.exports = {
  nodeLabel,
  ensureUserShell,
  openProfileEdit,
  openAppDrawer,
  typeInLabeledField,
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  openSmokeApplicationDetail,
  ...smokeApp,
};
