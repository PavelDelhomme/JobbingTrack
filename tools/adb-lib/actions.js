/**
 * Actions mobiles individuelles, parametrables et reutilisables.
 *
 * Usage:
 *   const { createAdb } = require('./client');
 *   const { exec } = require('./actions');
 *
 *   const adb = await createAdb();
 *   await exec('mob_login', { email: 'admin@jobbingtrack.test', password: 'password123' }, adb);
 *   await exec('mob_tap', { text: 'Candidatures' }, adb);
 *   await exec('mob_assert_text', { text: 'Bonjour' }, adb);
 */

const ACTIONS_CATALOG = [
  // Auth
  { id: 'mob_ensure_logged_out', name: 'Deconnexion si necessaire', category: 'auth', params: [] },
  { id: 'mob_login', name: 'Connexion complete', category: 'auth', params: [
    { key: 'email', label: 'Email', type: 'text', default: 'admin@jobbingtrack.test' },
    { key: 'password', label: 'Mot de passe', type: 'text', default: 'password123' },
  ]},
  { id: 'mob_logout', name: 'Deconnexion', category: 'auth', params: [] },

  // Navigation
  { id: 'mob_tap', name: 'Tap element', category: 'navigation', params: [
    { key: 'text', label: 'Texte', type: 'text', required: true },
    { key: 'index', label: 'Index', type: 'number', default: 0 },
  ]},
  { id: 'mob_tap_tab', name: 'Tap onglet bottom bar', category: 'navigation', params: [
    { key: 'tab', label: 'Numero', type: 'number', default: 1, required: true },
  ]},
  { id: 'mob_open_drawer', name: 'Ouvrir drawer', category: 'navigation', params: [] },
  { id: 'mob_drawer_item', name: 'Tap item drawer', category: 'navigation', params: [
    { key: 'text', label: 'Texte', type: 'text', required: true },
    { key: 'scroll', label: 'Scroller avant', type: 'boolean', default: false },
  ]},
  { id: 'mob_back', name: 'Retour', category: 'navigation', params: [] },
  { id: 'mob_home', name: 'Home', category: 'navigation', params: [] },

  // Saisie
  { id: 'mob_type_in_field', name: 'Saisir dans champ', category: 'saisie', params: [
    { key: 'hint', label: 'Hint', type: 'text', required: true },
    { key: 'value', label: 'Valeur', type: 'text', required: true },
  ]},
  { id: 'mob_close_keyboard', name: 'Fermer clavier', category: 'saisie', params: [] },

  // Gestes
  { id: 'mob_scroll_down', name: 'Scroll bas', category: 'geste', params: [
    { key: 'amount', label: 'Distance px', type: 'number', default: 800 },
  ]},
  { id: 'mob_scroll_up', name: 'Scroll haut', category: 'geste', params: [
    { key: 'amount', label: 'Distance px', type: 'number', default: 800 },
  ]},
  { id: 'mob_swipe', name: 'Swipe', category: 'geste', params: [
    { key: 'x1', type: 'number', default: 540 }, { key: 'y1', type: 'number', default: 1600 },
    { key: 'x2', type: 'number', default: 540 }, { key: 'y2', type: 'number', default: 600 },
    { key: 'duration', type: 'number', default: 400 },
  ]},
  { id: 'mob_tap_coords', name: 'Tap coordonnees', category: 'geste', params: [
    { key: 'x', type: 'number', default: 540, required: true },
    { key: 'y', type: 'number', default: 1100, required: true },
  ]},

  // Verification
  { id: 'mob_assert_text', name: 'Verifier texte present', category: 'verification', params: [
    { key: 'text', type: 'text', required: true },
  ]},
  { id: 'mob_assert_not_text', name: 'Verifier texte absent', category: 'verification', params: [
    { key: 'text', type: 'text', required: true },
  ]},
  { id: 'mob_wait_for', name: 'Attendre element', category: 'verification', params: [
    { key: 'text', type: 'text', required: true },
    { key: 'timeout', type: 'number', default: 30000 },
  ]},

  // Attente
  { id: 'mob_wait', name: 'Pause', category: 'attente', params: [
    { key: 'ms', type: 'number', default: 2000, required: true },
  ]},
];

/**
 * Execute une action mobile par son ID.
 * @param {string} actionId
 * @param {Record<string, any>} params
 * @param {import('./client').AdbClient} adb
 * @returns {Promise<string>} message de resultat
 */
async function exec(actionId, params, adb) {
  switch (actionId) {
    case 'mob_ensure_logged_out': {
      const onDash = await adb.uiContains('Bonjour');
      if (onDash) { await adb.tap('connexion'); await adb.wait(4000); return 'Deconnexion effectuee'; }
      const hasLogin = await adb.uiContains('Se connecter');
      if (hasLogin) return 'Deja sur ecran de connexion';
      for (let i = 0; i < 3; i++) {
        await adb.back(); await adb.wait(2000);
        if (await adb.uiContains('Se connecter')) return 'Retour ecran connexion';
        if (await adb.uiContains('Bonjour')) { await adb.tap('connexion'); await adb.wait(4000); return 'Deconnexion effectuee'; }
      }
      return 'Navigation vers login';
    }

    case 'mob_login': {
      const email = params.email || 'admin@jobbingtrack.test';
      const password = params.password || 'password123';
      await adb.wait(500);
      await adb.typeInField('Email', email); await adb.wait(800);
      await adb.typeInField('Mot de passe', password); await adb.wait(500);
      await adb.closeKeyboard(); await adb.wait(800);
      await adb.tap('connecter'); await adb.wait(4000);
      return `Connecte avec ${email}`;
    }

    case 'mob_logout': {
      if (await adb.uiContains('connexion')) { await adb.tap('connexion'); await adb.wait(4000); return 'Deconnecte'; }
      try { await adb.tapTab(1); await adb.wait(2000); } catch {}
      await adb.tap('connexion'); await adb.wait(4000);
      return 'Deconnecte';
    }

    case 'mob_tap': {
      if (!params.text) throw new Error('Parametre "text" requis');
      const msg = await adb.tap(params.text, params.index || 0);
      await adb.wait(1500);
      return msg;
    }

    case 'mob_tap_tab': {
      const tab = parseInt(params.tab || '1');
      if (!(await adb.uiContains(`Tab ${tab} of`))) { await adb.back(); await adb.wait(1500); }
      await adb.tapTab(tab); await adb.wait(2000);
      return `Onglet ${tab}`;
    }

    case 'mob_open_drawer':
      await adb.openDrawer(); await adb.wait(1500); return 'Drawer ouvert';

    case 'mob_drawer_item': {
      if (!params.text) throw new Error('Parametre "text" requis');
      if (params.scroll) { await adb.drawerScrollDown(); await adb.wait(800); }
      await adb.tap(params.text); await adb.wait(2500);
      return `Tap "${params.text}"`;
    }

    case 'mob_back':
      await adb.back(); await adb.wait(2000); return 'Retour';

    case 'mob_home':
      await adb.home(); await adb.wait(1000); return 'Home';

    case 'mob_type_in_field': {
      if (!params.hint || !params.value) throw new Error('"hint" et "value" requis');
      await adb.typeInField(params.hint, params.value); await adb.wait(600);
      return `Saisi "${params.value}" dans "${params.hint}"`;
    }

    case 'mob_close_keyboard':
      await adb.closeKeyboard(); await adb.wait(500); return 'Clavier ferme';

    case 'mob_scroll_down':
      await adb.scrollDown(params.amount || 800); await adb.wait(1000); return 'Scroll bas';

    case 'mob_scroll_up':
      await adb.scrollUp(params.amount || 800); await adb.wait(1000); return 'Scroll haut';

    case 'mob_swipe':
      await adb.swipe(params.x1 ?? 540, params.y1 ?? 1600, params.x2 ?? 540, params.y2 ?? 600, params.duration ?? 400);
      await adb.wait(1000);
      return `Swipe effectue`;

    case 'mob_tap_coords':
      await adb.tapXY(params.x ?? 540, params.y ?? 1100); await adb.wait(1500);
      return `Tap (${params.x}, ${params.y})`;

    case 'mob_assert_text': {
      const found = await adb.uiContains(params.text);
      if (!found) throw new Error(`"${params.text}" non trouve a l'ecran`);
      return `"${params.text}" present`;
    }

    case 'mob_assert_not_text': {
      const present = await adb.uiContains(params.text);
      if (present) throw new Error(`"${params.text}" present alors qu'il ne devrait pas`);
      return `"${params.text}" absent (OK)`;
    }

    case 'mob_wait_for': {
      const ok = await adb.waitFor(params.text, params.timeout || 30000);
      if (!ok) throw new Error(`"${params.text}" non apparu apres ${params.timeout || 30000}ms`);
      return `"${params.text}" apparu`;
    }

    case 'mob_wait':
      await adb.wait(params.ms || 2000);
      return `Pause ${params.ms || 2000}ms`;

    default:
      throw new Error(`Action "${actionId}" inconnue`);
  }
}

module.exports = { exec, ACTIONS_CATALOG };
