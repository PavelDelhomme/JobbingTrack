/**
 * Helpers partagés smokes ADB — session shell réutilisée, champs labelText Flutter.
 */

const adbLib = require('../../tools/adb-lib');

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
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

async function waitApplicationsTabReady(phone, timeoutMs = 12000) {
  const state = await phone.waitUntil(({ nodes, contains }) => {
    if (contains('Aucune candidature') || contains('Créer ma première candidature')) {
      return 'empty';
    }
    if (contains('Impossible de charger les candidatures')) return 'error';
    if (nodes.some((n) => n.clickable && nodeLabel(n).includes('Postulé'))) {
      return 'list';
    }
    return null;
  }, { timeoutMs, pollMs: 500 });
  return state || 'timeout';
}

async function openFirstApplicationDetail(phone) {
  await ensureApplicationsListTab(phone);
  const state = await waitApplicationsTabReady(phone);
  if (state === 'empty') {
    throw new Error('Aucune candidature — impossible de tester le détail');
  }
  if (state === 'error') {
    throw new Error('Erreur chargement candidatures sur l’appareil');
  }
  if (state === 'timeout') {
    throw new Error('Liste candidatures : timeout chargement');
  }

  const nodes = await phone.uiNodes();
  const card = nodes.find((n) => n.clickable && nodeLabel(n).includes('Postulé'));
  if (card) {
    const m = card.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const cx = Math.floor((+m[1] + +m[3]) / 2);
    const cy = Math.floor((+m[2] + +m[4]) / 2);
    await phone.tapXY(cx, cy);
  } else {
    await phone.tapXY(540, 1000);
  }
  await phone.wait(900);
}

module.exports = {
  nodeLabel,
  ensureUserShell,
  openProfileEdit,
  openAppDrawer,
  typeInLabeledField,
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  openFirstApplicationDetail,
};
