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

const { ADB_FAST } = require('./client');

/** Shell mobile : Accueil, Candidatures, Calendrier, Profil (4 onglets). */
const SHELL_TAB_COUNT = 4;

/** Shell mobile connecté (pas écran biométrique/login). */
async function isShellVisible(adb) {
  return adb.uiContains(`Tab 1 of ${SHELL_TAB_COUNT}`);
}

async function ensureAuthenticatedShell(adb, email, password) {
  const creds = resolveTestCredentials({ email, password });
  email = creds.email;
  password = creds.password;
  await dismissBiometricUnlock(adb, { password });
  if (await isShellVisible(adb)) return 'Shell OK';
  if (
    (await adb.uiContains('Déverrouiller')) ||
    (await adb.uiContains('Connexion par empreinte')) ||
    (await adb.uiContains('Mot de passe JobbingTrack'))
  ) {
    await dismissBiometricUnlock(adb, { password });
    if (await isShellVisible(adb)) return 'Shell après unlock';
  }
  await loginFresh(adb, email, password);
  await dismissBiometricUnlock(adb, { password });
  if (!(await isShellVisible(adb))) {
    throw new Error('Shell mobile introuvable après connexion');
  }
  return `Connecté (${email})`;
}


async function setInterimModeForSmoke(adb, enabled = true) {
  await adb.setFlutterPrefBool('interim_mode_enabled', enabled);
  return `interim_mode_enabled=${enabled}`;
}

async function dismissBiometricUnlock(adb, opts = {}) {
  const { password } = opts;
  let xml = '';
  try {
    xml = await adb.uiDump();
  } catch {
    xml = '';
  }
  if (!xml || xml.length < 50 || xml.includes('biometrics.app.setting')) {
    for (let i = 0; i < 3; i++) {
      await adb.back();
      await adb.wait(ADB_FAST ? 200 : 800);
      try {
        xml = await adb.uiDump(true);
      } catch {
        xml = '';
      }
      if (xml && !xml.includes('biometrics.app.setting') && xml.length > 100) break;
    }
  }

  if (
    (await adb.uiContains('Déverrouiller')) ||
    (await adb.uiContains('Confirmez votre identité'))
  ) {
    if (password && (await adb.uiContains('Mot de passe JobbingTrack'))) {
      const ok = await unlockWithJobbingTrackPassword(adb, password);
      if (ok) return true;
    }
    if (await adb.uiContains('Se déconnecter')) {
      await adb.tap('Se déconnecter');
      await adb.wait(1000);
      if (await adb.uiContains('Déconnexion')) {
        try {
          await adb.tap('Déconnexion', 1);
        } catch {
          await adb.tap('Déconnexion');
        }
      }
      await adb.wait(3500);
      return true;
    }
    if (await adb.uiContains('Mot de passe JobbingTrack')) {
      if (password) {
        const ok = await unlockWithJobbingTrackPassword(adb, password);
        if (ok) return true;
      }
      await adb.tap('Mot de passe JobbingTrack');
      await adb.wait(2500);
      return true;
    }
    if (await adb.uiContains('Se connecter avec le mot de passe')) {
      await adb.tap('Se connecter avec le mot de passe');
      await adb.wait(2500);
      return true;
    }
  }
  return false;
}

async function unlockWithJobbingTrackPassword(adb, password) {
  if (!(await adb.uiContains('Mot de passe JobbingTrack'))) return false;
  await adb.tap('Mot de passe JobbingTrack');
  await adb.wait(1500);
  if (!(await adb.uiContains('Mot de passe'))) {
    await adb.wait(1500);
  }
  try {
    await adb.typeInField('Mot de passe', password);
  } catch {
    await adb.typeInEditTextByIndex(0, password);
  }
  await adb.wait(400);
  try {
    await adb.tap('Déverrouiller', 1);
  } catch {
    await adb.tap('Déverrouiller');
  }
  await adb.wait(4000);
  if (await adb.uiContains('Bonjour')) return true;
  return !(await adb.uiContains('Mot de passe JobbingTrack'));
}

async function tapLogout(adb) {
  if (await adb.uiContains('Déconnexion')) {
    await adb.tap('Déconnexion');
    await adb.wait(1000);
    if (await adb.uiContains('Déconnexion')) {
      try {
        await adb.tap('Déconnexion', 1);
      } catch {
        await adb.tap('Déconnexion');
      }
    }
    await adb.wait(3500);
    return true;
  }
  return false;
}

async function clearAppDataForSmoke(adb) {
  await adb.shellCommand('pm clear com.example.jobbingtrack_mobile');
  await adb.wait(2000);
  await adb.shellCommand(
    'monkey -p com.example.jobbingtrack_mobile -c android.intent.category.LAUNCHER 1',
  );
  await adb.wait(5000);
  await dismissBiometricUnlock(adb);
  for (let i = 0; i < 12; i++) {
    if (
      (await adb.uiContains('Email')) ||
      (await adb.uiContains('Se connecter')) ||
      (await adb.uiContains('Connexion par empreinte')) ||
      (await adb.uiContains('Créer un compte'))
    ) {
      return 'App reset OK';
    }
    await dismissBiometricUnlock(adb);
    await adb.wait(1500);
  }
  throw new Error('Ecran login introuvable après pm clear');
}

async function restartApp(adb) {
  await adb.shellCommand('am force-stop com.example.jobbingtrack_mobile');
  await adb.wait(1500);
  await adb.shellCommand('monkey -p com.example.jobbingtrack_mobile -c android.intent.category.LAUNCHER 1');
  await adb.wait(4000);
  await dismissBiometricUnlock(adb);
}

async function ensureLoggedOut(adb) {
  await dismissBiometricUnlock(adb);

  if (
    (await adb.uiContains('Connexion')) &&
    ((await adb.uiContains('JobbingTrack')) || (await adb.uiContains('Email')))
  ) {
    return 'Deja sur ecran de connexion';
  }

  if (await adb.uiContains('Aller à la connexion')) {
    try {
      await adb.tap('Aller à la connexion');
    } catch {
      await adb.tap('connexion');
    }
    await adb.wait(3000);
  }

  if (await adb.uiContains('Se connecter') && (await adb.uiContains('Connexion'))) {
    return 'Deja sur ecran de connexion';
  }

  if (await adb.uiContains('Bonjour')) {
    if (await tapLogout(adb)) return 'Deconnexion effectuee (app bar)';
    try {
      await adb.tapTab(4);
      await adb.wait(2000);
    } catch {}
    if (await tapLogout(adb)) return 'Deconnexion effectuee (profil)';
    await adb.openDrawer();
    await adb.wait(1200);
    await adb.drawerScrollDown();
    await adb.wait(600);
    if (await tapLogout(adb)) {
      await adb.wait(1000);
      return 'Deconnexion effectuee (drawer)';
    }
    await adb.back();
    await adb.wait(1000);
  }

  if (await adb.uiContains('Se connecter')) return 'Deja sur ecran de connexion';

  for (let i = 0; i < 4; i++) {
    await adb.back();
    await adb.wait(2000);
    if (await dismissBiometricUnlock(adb)) continue;
    if (await adb.uiContains('Se connecter')) return 'Retour ecran connexion';
    if (await adb.uiContains('Bonjour') && (await tapLogout(adb))) {
      return 'Deconnexion effectuee';
    }
  }

  if (
    !(await adb.uiContains('Email')) &&
    !(await adb.uiContains('Mot de passe')) &&
    !(await adb.uiContains('Se connecter'))
  ) {
    await restartApp(adb);
    if (await adb.uiContains('Aller à la connexion')) {
      await adb.tap('Aller à la connexion');
      await adb.wait(2500);
    }
  }
  return 'Tentative navigation vers login';
}

async function logout(adb) {
  if (await adb.uiContains('Bonjour') || (await adb.uiContains('Déconnexion'))) {
    if (await tapLogout(adb)) return 'Deconnecte';
  }
  try {
    await adb.tapTab(SHELL_TAB_COUNT);
    await adb.wait(2000);
    if (await tapLogout(adb)) return 'Deconnecte';
  } catch {}
  if (await adb.uiContains('connexion')) {
    await adb.tap('connexion');
    await adb.wait(4000);
    return 'Deconnecte';
  }
  try {
    await adb.tapTab(1);
    await adb.wait(2000);
  } catch {}
  if (await tapLogout(adb)) return 'Deconnecte';
  await adb.tap('connexion');
  await adb.wait(4000);
  return 'Deconnecte';
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

async function isPasswordLoginForm(adb) {
  if (await adb.uiContains('Bonjour')) return false;
  if (await adb.uiContains('Retour à la connexion')) return false;
  if (await adb.uiContains('Mot de passe oublié') && !(await adb.uiContains('Se connecter'))) {
    return false;
  }
  if (await adb.uiContains('Email')) return true;
  const edits = await adb.listEditTexts();
  return edits.length >= 2 && (await adb.uiContains('Se connecter'));
}

/** Écran « mot de passe oublié » ou reset — revenir au formulaire login. */
async function ensureLoginFormScreen(adb) {
  const snap = await adb.uiSnapshot(true);
  if (
    snap.contains('Retour à la connexion') ||
    (snap.contains('Mot de passe oublié') && !snap.contains('Se connecter'))
  ) {
    try {
      await adb.tap('Retour à la connexion');
    } catch {
      await adb.back();
    }
    await adb.wait(400);
  }
}

async function fillLoginFields(adb, email, password) {
  let edits = await adb.listEditTexts();
  if (edits.length >= 2) {
    await adb.typeInEditTextByIndex(0, email, { isEmail: true });
    await adb.wait(300);
    await adb.typeInEditTextByIndex(1, password, { isPassword: true });
    return;
  }
  if (edits.length === 1) {
    await adb.typeInEditTextByIndex(0, email, { isEmail: true });
    await adb.wait(300);
    await adb.tapXY(540, 1320);
    await adb.wait(300);
    adb._invalidateUi();
    edits = await adb.listEditTexts();
    const pwdIdx = edits.length >= 2 ? 1 : 0;
    await adb.typeInEditTextByIndex(pwdIdx, password, { isPassword: true });
    return;
  }
  try {
    await adb.typeInField('Email', email);
  } catch {
    throw new Error('Champ email introuvable');
  }
  await adb.wait(300);
  edits = await adb.listEditTexts();
  if (edits.length >= 2) {
    await adb.typeInEditTextByIndex(1, password, { isPassword: true });
  } else if (edits.length === 1) {
    await adb.tapXY(540, 1320);
    await adb.wait(300);
    await adb.typeInEditTextByIndex(0, password, { isPassword: true });
  } else {
    throw new Error('Champ mot de passe introuvable');
  }
}

async function login(adb, email, password) {
  const creds = resolveTestCredentials({ email, password });
  email = creds.email;
  password = creds.password;
  await ensureLoginFormScreen(adb);
  if (!(await isPasswordLoginForm(adb)) && !(await adb.uiContains('Email'))) {
    await ensureFullLoginForm(adb);
  }
  await ensureLoginFormScreen(adb);
  await adb.wait(300);

  await fillLoginFields(adb, email, password);

  await adb.wait(200);
  await adb.enter();
  let home = await adb.waitFor('Bonjour', ADB_FAST ? 10000 : 15000);
  if (!home) {
    await adb.scrollDown(500);
    await adb.wait(200);
    try {
      await adb.tap('Se connecter');
    } catch {
      await adb.tapXY(540, 1680);
    }
    home = await adb.waitFor('Bonjour', ADB_FAST ? 8000 : 12000);
  }
  if (!home) {
    if (await adb.uiContains('Erreur')) {
      throw new Error('Connexion echouee (erreur API visible)');
    }
    if (await adb.uiContains('Retour à la connexion')) {
      throw new Error('Connexion echouee (ecran mot de passe oublie)');
    }
    throw new Error('Connexion echouee (Bonjour introuvable)');
  }
  return `Connecte avec ${email}`;
}

async function loginFresh(adb, email, password) {
  const creds = resolveTestCredentials({ email, password });
  email = creds.email;
  password = creds.password;
  await ensureLoggedOut(adb);
  for (let i = 0; i < 15; i++) {
    await dismissBiometricUnlock(adb, { password });
    if (await adb.uiContains('Bonjour')) {
      return `Deja connecte (${email})`;
    }
    if (
      (await adb.uiContains('Email')) ||
      (await adb.uiContains('Mot de passe')) ||
      ((await adb.uiContains('Connexion')) &&
        (await adb.uiContains('Se connecter')) &&
        (await adb.listEditTexts()).length >= 2)
    ) {
      break;
    }
    if (await adb.uiContains('Bonjour')) {
      await tapLogout(adb);
    } else if (await adb.uiContains('Aller à la connexion')) {
      await adb.tap('Aller à la connexion');
      await adb.wait(2500);
    }
    await adb.wait(2000);
  }
  if (
    !(await adb.uiContains('Email')) &&
    !(await adb.uiContains('Mot de passe')) &&
    !(await adb.uiContains('Se connecter'))
  ) {
    await restartApp(adb);
    for (let i = 0; i < 8; i++) {
      await dismissBiometricUnlock(adb, { password });
      if ((await adb.uiContains('Email')) || (await adb.uiContains('Mot de passe'))) break;
      if (await adb.uiContains('Bonjour')) return `Connecte via unlock (${email})`;
      await adb.wait(2000);
    }
  }
  await ensureFullLoginForm(adb);
  if (
    !(await adb.uiContains('Email')) &&
    !(await adb.uiContains('Mot de passe')) &&
    !(await adb.uiContains('Se connecter')) &&
    (await adb.listEditTexts()).length < 2
  ) {
    throw new Error('Ecran de connexion introuvable après déconnexion');
  }
  return login(adb, email, password);
}

async function loginWithoutKeepLoggedIn(adb, email, password) {
  const creds = resolveTestCredentials({ email, password });
  email = creds.email;
  password = creds.password;
  await ensureFullLoginForm(adb);
  if (await adb.uiContains('Garder la connexion')) {
    try {
      await adb.tap('Garder la connexion');
      await adb.wait(600);
    } catch {}
  }
  return login(adb, email, password);
}

// ─── Registration ────────────────────────────────────────────────

async function ensureFullLoginForm(adb) {
  await dismissBiometricUnlock(adb);
  if (
    (await adb.uiContains('Connexion par empreinte')) ||
    (await adb.uiContains('Compte enregistré'))
  ) {
    if ((await adb.uiContains('Email')) || (await isPasswordLoginForm(adb))) {
      return 'Formulaire login visible';
    }
    for (const label of ['Se connecter avec le mot de passe', 'Utiliser un autre compte']) {
      try {
        await adb.tap(label);
        await adb.wait(1500);
        if ((await adb.uiContains('Email')) || (await isPasswordLoginForm(adb))) {
          return 'Formulaire login ouvert';
        }
      } catch {}
    }
  }
  if (!(await isPasswordLoginForm(adb)) && !(await adb.uiContains('Email'))) {
    await adb.scrollDown(800);
    await adb.wait(800);
  }
  return 'Formulaire login';
}

async function ensureOnLoginScreen(adb) {
  await dismissBiometricUnlock(adb);
  if (
    (await adb.uiContains('Email')) ||
    (await adb.uiContains('Mot de passe')) ||
    (await adb.uiContains('Connexion par empreinte')) ||
    ((await adb.uiContains('Connexion')) && (await adb.uiContains('Se connecter')))
  ) {
    return true;
  }
  if (await adb.uiContains('Bonjour')) {
    await logout(adb);
    await adb.wait(2000);
    await dismissBiometricUnlock(adb);
    return ensureOnLoginScreen(adb);
  }
  await restartApp(adb);
  await adb.wait(2000);
  await dismissBiometricUnlock(adb);
  return (
    (await adb.uiContains('Email')) ||
    (await adb.uiContains('Connexion par empreinte')) ||
    (await adb.uiContains('Se connecter'))
  );
}

async function tapRegisterLink(adb) {
  const labels = ["S'inscrire", 'inscrire', 'Pas encore de compte'];
  for (const label of labels) {
    if (!(await adb.uiContains(label.split(' ')[0]))) continue;
    try {
      await adb.tap(label);
      await adb.wait(2500);
      return 'Ecran inscription';
    } catch {}
  }
  for (let i = 0; i < 3; i++) {
    await adb.scrollDown(900);
    await adb.wait(700);
    for (const label of labels) {
      try {
        await adb.tap(label);
        await adb.wait(2500);
        return 'Ecran inscription';
      } catch {}
    }
  }
  throw new Error('Lien inscription introuvable (S\'inscrire)');
}

async function goToRegister(adb) {
  const onLogin = await ensureOnLoginScreen(adb);
  if (!onLogin) {
    throw new Error('Ecran de connexion introuvable avant inscription');
  }
  await ensureFullLoginForm(adb);
  if (await adb.uiContains('Créer un compte') || (await adb.uiContains('Inscription'))) {
    await adb.wait(1000);
    return 'Ecran inscription';
  }
  return tapRegisterLink(adb);
}

async function register(adb, opts = {}) {
  const { firstName = 'Test', lastName = 'Mobile', email, password = 'Test123!' } = opts;
  const finalEmail = email || `test-${Date.now()}@example.com`;

  await adb.typeInEditTextByIndex(0, firstName);
  await adb.wait(500);
  await adb.typeInEditTextByIndex(1, lastName);
  await adb.wait(500);
  await adb.typeInEditTextByIndex(2, finalEmail, { isEmail: true });
  await adb.wait(500);
  await adb.typeInEditTextByIndex(3, password);
  await adb.wait(500);
  await adb.typeInEditTextByIndex(4, password);
  await adb.wait(500);
  await adb.closeKeyboard();
  await adb.wait(600);
  await adb.scrollDown(500);
  await adb.wait(500);
  try { await adb.tap('conditions'); } catch {
    try { await adb.tap("J'accepte les conditions"); } catch {}
  }
  await adb.wait(400);
  // Télémétrie cochée par défaut à l'inscription — ne pas toggler (décocher bloque la création).
  await adb.scrollDown(800);
  await adb.wait(800);
  try { await adb.tap('inscrire'); } catch { await adb.tap("S'inscrire"); }
  await adb.wait(8000);
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

async function goToTab(adb, tabNumber, { shell = false } = {}) {
  const tabLabel = shell
    ? `Tab ${tabNumber} of ${SHELL_TAB_COUNT}`
    : `Tab ${tabNumber} of`;
  let snap = await adb.uiSnapshot();
  if (!snap.contains(tabLabel)) {
    if (shell) {
      await ensureOnDashboard(adb);
    } else {
      await adb.back();
      await adb.wait(600);
    }
    snap = await adb.uiSnapshot(true);
  }
  if (!snap.contains(tabLabel)) {
    throw new Error(`Onglet introuvable: ${tabLabel}`);
  }
  await adb.tap(tabLabel);
  await adb.wait(500);
  return shell ? `Shell onglet ${tabNumber}` : `Onglet ${tabNumber}`;
}

async function navigateAllTabs(adb, tabCount = SHELL_TAB_COUNT) {
  const results = [];
  for (let i = 1; i <= tabCount; i++) {
    results.push(await goToTab(adb, i, { shell: true }));
  }
  await goToTab(adb, 1, { shell: true });
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
  setInterimModeForSmoke,
  ensureAuthenticatedShell,
  isShellVisible,
  clearAppDataForSmoke,
  dismissBiometricUnlock,
  ensureLoggedOut,
  login,
  logout,
  loginFresh,
  loginWithoutKeepLoggedIn,
  unlockWithJobbingTrackPassword,
  ensureFullLoginForm,
  restartApp,
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
