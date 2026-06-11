/**
 * Flows de haut niveau – chaque flow est une fonction async reutilisable
 * qui compose des actions du client ADB pour accomplir un objectif metier.
 *
 * Usage:
 *   const { createAdb } = require('./client');
 *   const flows = require('./flows');
 *
 *   const adb = await createAdb();
 *   await flows.ensureLoggedOut(adb);
 *   await flows.login(adb, 'admin@jobbingtrack.test', 'password123');
 *   await flows.navigateAllTabs(adb);
 *   await flows.openDrawerItem(adb, 'Relances');
 */

// ─── Auth ────────────────────────────────────────────────────────

async function ensureLoggedOut(adb) {
  const onDash = await adb.uiContains('Bonjour');
  if (onDash) {
    await adb.tap('connexion');
    await adb.wait(4000);
    return 'Deconnexion effectuee';
  }
  if (await adb.uiContains('Se connecter')) return 'Deja sur ecran de connexion';
  for (let i = 0; i < 3; i++) {
    await adb.back();
    await adb.wait(2000);
    if (await adb.uiContains('Se connecter')) return 'Retour ecran connexion';
    if (await adb.uiContains('Bonjour')) {
      await adb.tap('connexion');
      await adb.wait(4000);
      return 'Deconnexion effectuee';
    }
  }
  return 'Tentative navigation vers login';
}

function resolveTestCredentials(overrides = {}) {
  const email =
    overrides.email ||
    process.env.TEST_USER_EMAIL ||
    process.env.TEST_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL;
  const password =
    overrides.password ||
    process.env.TEST_USER_PASSWORD ||
    process.env.TEST_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Credentials mobile manquants: definir TEST_USER_EMAIL/TEST_USER_PASSWORD ou TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD',
    );
  }
  return { email, password };
}

async function login(adb, email, password) {
  const creds = resolveTestCredentials({ email, password });
  email = creds.email;
  password = creds.password;
  await adb.wait(500);
  await adb.typeInField('Email', email);
  await adb.wait(800);
  await adb.typeInField('Mot de passe', password);
  await adb.wait(500);
  await adb.closeKeyboard();
  await adb.wait(800);
  await adb.tap('connecter');
  await adb.wait(4000);
  return `Connecte avec ${email}`;
}

async function logout(adb) {
  if (await adb.uiContains('connexion')) {
    await adb.tap('connexion');
    await adb.wait(4000);
    return 'Deconnecte';
  }
  try { await adb.tapTab(1); await adb.wait(2000); } catch {}
  await adb.tap('connexion');
  await adb.wait(4000);
  return 'Deconnecte';
}

async function loginFresh(adb, email, password) {
  await ensureLoggedOut(adb);
  return login(adb, email, password);
}

// ─── Registration ────────────────────────────────────────────────

async function goToRegister(adb) {
  try {
    await adb.tap('inscrire');
  } catch {
    await adb.scrollDown(1200);
    await adb.wait(1000);
    await adb.tap('inscrire');
  }
  await adb.wait(2500);
  return 'Ecran inscription';
}

async function register(adb, opts = {}) {
  const { firstName = 'Test', lastName = 'Mobile', email, password = 'Test123!' } = opts;
  const finalEmail = email || `test-${Date.now()}@example.com`;

  await adb.typeInField('pr', firstName);
  await adb.wait(600);
  await adb.typeInField('Nom', lastName);
  await adb.wait(600);
  await adb.typeInField('Email', finalEmail);
  await adb.wait(600);
  await adb.typeInField('Minimum', password);
  await adb.wait(600);
  await adb.typeInField('Retapez', password);
  await adb.wait(500);
  await adb.closeKeyboard();
  await adb.wait(800);
  try { await adb.tap('conditions'); } catch {}
  await adb.wait(500);
  await adb.scrollDown(1200);
  await adb.wait(800);
  try { await adb.tap('inscrire'); } catch { await adb.tap("S'inscrire"); }
  await adb.wait(4000);
  return { message: `Inscrit: ${finalEmail}`, email: finalEmail, password };
}

async function registerAndLogin(adb, opts = {}) {
  await ensureLoggedOut(adb);
  await goToRegister(adb);
  const { email, password } = await register(adb, opts);
  await adb.wait(1000);
  try { await adb.tap('connecter'); } catch { await adb.back(); await adb.wait(1500); }
  await adb.wait(2000);
  await login(adb, email, password);
  return { email, password };
}

// ─── Navigation ──────────────────────────────────────────────────

async function ensureOnDashboard(adb) {
  if (await adb.uiContains('Bonjour')) return 'Deja sur dashboard';
  try { await adb.tapTab(1); await adb.wait(2000); return 'Retour Accueil via tab'; } catch {}
  await adb.back();
  await adb.wait(1500);
  try { await adb.tapTab(1); await adb.wait(2000); return 'Retour Accueil'; } catch {}
  return 'Tentative retour Accueil';
}

async function goToTab(adb, tabNumber) {
  if (!(await adb.uiContains(`Tab ${tabNumber} of`))) {
    await adb.back();
    await adb.wait(1500);
  }
  await adb.tapTab(tabNumber);
  await adb.wait(2500);
  return `Onglet ${tabNumber}`;
}

async function navigateAllTabs(adb, tabCount = 5) {
  const results = [];
  for (let i = 1; i <= tabCount; i++) {
    results.push(await goToTab(adb, i));
  }
  await goToTab(adb, 1);
  return results;
}

async function openDrawerItem(adb, text, { scroll = false } = {}) {
  await adb.openDrawer();
  await adb.wait(1500);
  if (scroll) {
    await adb.drawerScrollDown();
    await adb.wait(800);
  }
  await adb.tap(text);
  await adb.wait(2500);
  return `Drawer -> ${text}`;
}

async function visitDrawerItems(adb, items) {
  const results = [];
  for (const item of items) {
    const name = typeof item === 'string' ? item : item.text;
    const scroll = typeof item === 'string' ? false : !!item.scroll;
    try {
      results.push({ item: name, result: await openDrawerItem(adb, name, { scroll }) });
    } catch (err) {
      results.push({ item: name, error: err.message });
    }
    await adb.back();
    await adb.wait(1500);
  }
  return results;
}

// ─── Password reset ──────────────────────────────────────────────

async function forgotPassword(adb, email = 'admin@jobbingtrack.test') {
  await adb.tap('oubli');
  await adb.wait(2000);
  await adb.typeInField('Email', email);
  await adb.wait(500);
  await adb.closeKeyboard();
  await adb.wait(500);
  await adb.tap('Envoyer');
  await adb.wait(3000);
  await adb.back();
  await adb.wait(2000);
  return `Lien reset envoye pour ${email}`;
}

// ─── Scroll / Inspection ─────────────────────────────────────────

async function scrollAndCheck(adb, text, maxScrolls = 5) {
  for (let i = 0; i < maxScrolls; i++) {
    if (await adb.uiContains(text)) return { found: true, scrolls: i };
    await adb.scrollDown(800);
    await adb.wait(1000);
  }
  return { found: false, scrolls: maxScrolls };
}

async function screenshot(adb) {
  return adb.screenshotUrl();
}

async function listVisibleTexts(adb) {
  const nodes = await adb.uiNodes();
  return nodes.filter(n => n.text).map(n => n.text);
}

// ─── Composition helpers ─────────────────────────────────────────

/**
 * Execute une sequence d'actions en serie.
 * Chaque action est une function(adb) ou un objet { fn, args }.
 */
async function sequence(adb, steps) {
  const results = [];
  for (const step of steps) {
    if (typeof step === 'function') {
      results.push(await step(adb));
    } else if (step.fn) {
      results.push(await step.fn(adb, ...( step.args || [])));
    }
  }
  return results;
}

module.exports = {
  ensureLoggedOut,
  login,
  logout,
  loginFresh,
  goToRegister,
  register,
  registerAndLogin,
  ensureOnDashboard,
  goToTab,
  navigateAllTabs,
  openDrawerItem,
  visitDrawerItems,
  forgotPassword,
  scrollAndCheck,
  screenshot,
  listVisibleTexts,
  sequence,
};
