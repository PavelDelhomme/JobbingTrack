/**
 * Helpers partagés smokes ADB — un dump UI par boucle d'attente, pas de sleeps fixes longs.
 */

const adbLib = require('../../tools/adb-lib');

function nodeLabel(n) {
  return `${n.text || ''}\n${n.contentDesc || ''}`.trim();
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
  ensureApplicationsListTab,
  waitApplicationsTabReady,
  openFirstApplicationDetail,
};
