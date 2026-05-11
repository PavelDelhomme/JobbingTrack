/**
 * Scenarios predefinis pour l'app mobile.
 * Chaque scenario est un enchainement de flows avec description.
 *
 * Usage:
 *   const { SCENARIOS } = require('./scenarios');
 *   console.log(Object.keys(SCENARIOS));
 *   await SCENARIOS.login_quick.run(adb);
 */

const flows = require('./flows');

const SCENARIOS = {

  // ═══════════════════════════════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════════════════════════════

  login_quick: {
    name: 'Login rapide',
    category: 'auth',
    description: 'Deconnexion si besoin -> connexion -> verifier dashboard',
    run: async (adb, opts = {}) => {
      await flows.ensureLoggedOut(adb);
      await flows.login(adb, opts.email, opts.password);
      await adb.assertVisible('Bonjour');
      return 'Login rapide OK';
    },
  },

  registration: {
    name: 'Inscription complete',
    category: 'auth',
    description: 'Deconnexion -> inscription -> login -> dashboard',
    run: async (adb, opts = {}) => {
      const { email, password } = await flows.registerAndLogin(adb, opts);
      return `Inscription + login OK (${email})`;
    },
  },

  password_reset: {
    name: 'Reset mot de passe',
    category: 'auth',
    description: 'Deconnexion -> mot de passe oublie -> email -> retour',
    run: async (adb, opts = {}) => {
      await flows.ensureLoggedOut(adb);
      return flows.forgotPassword(adb, opts.email);
    },
  },

  login_logout: {
    name: 'Login + Deconnexion',
    category: 'auth',
    description: 'Cycle complet connexion -> dashboard -> deconnexion',
    run: async (adb, opts = {}) => {
      await flows.loginFresh(adb, opts.email, opts.password);
      await adb.wait(2000);
      await flows.logout(adb);
      return 'Login + Deconnexion OK';
    },
  },

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  navigation_bottom_bar: {
    name: 'Navigation bottom bar',
    category: 'navigation',
    description: 'Parcourir les 5 onglets de la bottom navigation',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      await flows.navigateAllTabs(adb);
      return 'Bottom bar OK';
    },
  },

  navigation_drawer_all: {
    name: 'Drawer complet',
    category: 'navigation',
    description: 'Ouvrir le drawer et visiter chaque section',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      const results = await flows.visitDrawerItems(adb, [
        'Candidatures',
        'Entreprises',
        'Contacts',
        'Entretiens',
        'Appels',
        'Relances',
        { text: 'Rappels', scroll: false },
      ]);
      return { message: 'Drawer complet OK', results };
    },
  },

  navigation_drawer_admin: {
    name: 'Drawer sections admin',
    category: 'navigation',
    description: 'Visiter les sections admin du drawer',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      const results = await flows.visitDrawerItems(adb, [
        { text: 'Analytics', scroll: true },
        { text: 'Statistiques', scroll: true },
        { text: 'Utilisateurs', scroll: true },
        { text: 'Logs', scroll: true },
        { text: 'Corbeille', scroll: true },
      ]);
      return { message: 'Drawer admin OK', results };
    },
  },

  navigation_complete: {
    name: 'Navigation complete',
    category: 'navigation',
    description: 'Bottom bar + drawer complet',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      await flows.navigateAllTabs(adb);
      const drawerResults = await flows.visitDrawerItems(adb, [
        'Candidatures', 'Entreprises', 'Contacts',
        'Entretiens', 'Appels', 'Relances',
        { text: 'Statistiques', scroll: true },
      ]);
      return { tabs: 'OK', drawer: drawerResults };
    },
  },

  // ═══════════════════════════════════════════════════════════════
  //  VERIFICATION
  // ═══════════════════════════════════════════════════════════════

  verify_dashboard: {
    name: 'Verification dashboard',
    category: 'verification',
    description: 'Verifier stats, actions rapides, section admin',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      const checks = {};
      checks.candidatures = await adb.uiContains('Candidatures');
      checks.entretiens = await adb.uiContains('Entretiens');
      checks.relances = await adb.uiContains('Relances');
      await adb.scrollDown(600);
      await adb.wait(1000);
      checks.actionsRapides = await adb.uiContains('Actions rapides');
      await adb.scrollDown(600);
      await adb.wait(1000);
      checks.admin = await adb.uiContains('Administration');
      await adb.scrollUp(1200);
      await adb.wait(500);
      return checks;
    },
  },

  verify_candidatures: {
    name: 'Verification candidatures',
    category: 'verification',
    description: 'Verifier la liste et le detail d\'une candidature',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      await flows.goToTab(adb, 2);
      const hasList = await adb.uiContains('Mes Candidatures') || await adb.uiContains('candidature');
      try { await adb.tap('Voir', 0); await adb.wait(2500); } catch {}
      await adb.back(); await adb.wait(1500);
      await flows.goToTab(adb, 1);
      return { list: hasList };
    },
  },

  verify_search_hub: {
    name: 'Verification hub recherche',
    category: 'verification',
    description: 'Explorer les onglets du hub recherche',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      await flows.goToTab(adb, 3);
      const tabs = [];
      for (const tab of ['Entreprises', 'Contacts', 'Entretiens', 'Relances']) {
        try { await adb.tap(tab); await adb.wait(1500); tabs.push(tab); } catch {}
      }
      await flows.goToTab(adb, 1);
      return { tabs };
    },
  },

  verify_all_screens: {
    name: 'Verification tous ecrans',
    category: 'verification',
    description: 'Ouvrir et verifier chaque ecran',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      const results = {};
      for (let i = 2; i <= 5; i++) {
        await flows.goToTab(adb, i);
        results[`tab_${i}`] = true;
      }
      await flows.goToTab(adb, 1);
      const drawerScreens = await flows.visitDrawerItems(adb, [
        'Candidatures', 'Entreprises', 'Contacts',
        'Entretiens', 'Appels', 'Relances',
      ]);
      results.drawer = drawerScreens;
      return results;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  //  CRUD
  // ═══════════════════════════════════════════════════════════════

  crud_candidature: {
    name: 'CRUD Candidature',
    category: 'crud',
    description: 'Liste -> detail -> tester boutons ajout entretien/relance/appel',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      await flows.goToTab(adb, 2);
      try {
        await adb.tap('Voir', 0);
        await adb.wait(2500);
        const detail = {};
        detail.entretien = await adb.uiContains('entretien') || await adb.uiContains('Entretien');
        detail.relance = await adb.uiContains('relance') || await adb.uiContains('Relance');
        await adb.back(); await adb.wait(1500);
        await flows.goToTab(adb, 1);
        return detail;
      } catch {
        await flows.goToTab(adb, 1);
        return { noData: 'Aucune candidature' };
      }
    },
  },

  archive_corbeille: {
    name: 'Archives & Corbeille',
    category: 'crud',
    description: 'Visiter Archives et Corbeille via drawer',
    run: async (adb) => {
      await flows.ensureOnDashboard(adb);
      const results = await flows.visitDrawerItems(adb, [
        { text: 'Archives', scroll: true },
        { text: 'Corbeille', scroll: true },
      ]);
      return results;
    },
  },

  // ═══════════════════════════════════════════════════════════════
  //  PARCOURS COMPLETS
  // ═══════════════════════════════════════════════════════════════

  first_use: {
    name: 'Premiere utilisation',
    category: 'complet',
    description: 'Login -> dashboard -> exploration bottom bar + recherche',
    run: async (adb, opts = {}) => {
      await flows.ensureLoggedOut(adb);
      await flows.login(adb, opts.email, opts.password);
      await adb.assertVisible('Bonjour');
      await flows.navigateAllTabs(adb);
      return 'Premiere utilisation OK';
    },
  },

  daily_use: {
    name: 'Usage quotidien',
    category: 'complet',
    description: 'Login -> dashboard -> candidatures -> recherche -> calendrier -> relances',
    run: async (adb, opts = {}) => {
      await flows.loginFresh(adb, opts.email, opts.password);
      await flows.goToTab(adb, 2);
      try { await adb.tap('Voir', 0); await adb.wait(2000); await adb.back(); await adb.wait(1500); } catch {}
      await flows.goToTab(adb, 3);
      try { await adb.tap('Contacts'); await adb.wait(1500); } catch {}
      await flows.goToTab(adb, 4);
      await flows.goToTab(adb, 1);
      await flows.openDrawerItem(adb, 'Relances');
      await adb.back(); await adb.wait(1500);
      return 'Usage quotidien OK';
    },
  },

  complete: {
    name: 'Parcours complet',
    category: 'complet',
    description: 'Login -> tout explorer -> deconnexion',
    run: async (adb, opts = {}) => {
      await flows.ensureLoggedOut(adb);
      await flows.login(adb, opts.email, opts.password);
      await adb.assertVisible('Bonjour');
      await adb.scrollDown(1000); await adb.wait(1500);
      await adb.scrollUp(1000); await adb.wait(1000);
      await flows.navigateAllTabs(adb);
      await flows.visitDrawerItems(adb, [
        'Candidatures', 'Entreprises', 'Contacts',
        'Entretiens', 'Appels', 'Relances',
        { text: 'Statistiques', scroll: true },
        { text: 'Corbeille', scroll: true },
      ]);
      await flows.ensureOnDashboard(adb);
      await flows.logout(adb);
      return 'Parcours complet OK';
    },
  },
};

module.exports = { SCENARIOS };
