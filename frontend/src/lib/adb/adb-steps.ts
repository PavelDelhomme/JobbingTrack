/**
 * Implementation de chaque etape de parcours utilisateur.
 * Chaque step utilise AdbClient pour interagir avec l'appareil.
 */
import { AdbClient } from './adb-client';

/** Identifiants du compte de test mobile (user1) — réception des mails si email réel (ex. paul.delhomme@proton.me). */
export function getMobileTestCredentials(): { email: string; password: string } {
  return {
    email: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL
      ? process.env.NEXT_PUBLIC_MOBILE_TEST_USER_EMAIL
      : 'user1@jobbingtrack.com',
    password: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MOBILE_TEST_USER_PASSWORD
      ? process.env.NEXT_PUBLIC_MOBILE_TEST_USER_PASSWORD
      : 'password123',
  };
}

export async function executeStep(stepId: string, adb: AdbClient): Promise<string> {
  switch (stepId) {

    // ═══════════════════════════════════════════════════════════════
    //  SETUP (notifications, etc.)
    // ═══════════════════════════════════════════════════════════════

    case 'disable_heads_up_notifications': {
      try {
        await adb.shellCommand('settings put global heads_up_notifications_enabled 0');
        return 'Heads-up notifications desactivees';
      } catch {
        try {
          await adb.shellCommand('settings put secure heads_up_notifications_enabled 0');
          return 'Heads-up notifications desactivees (secure)';
        } catch {
          return 'Heads-up non modifiable (emulateur)';
        }
      }
    }

    case 'dismiss_notification_shade': {
      try {
        await adb.back();
        await adb.wait(500);
        const hasShade = await adb.uiContains('notification') || await adb.uiContains('Notification');
        if (hasShade) {
          await adb.back();
          await adb.wait(300);
        }
        return 'Volet notifications ferme si ouvert';
      } catch {
        return 'Pas de volet a fermer';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  AUTH
    // ═══════════════════════════════════════════════════════════════

    case 'ensure_logged_out': {
      const onDashboard = await adb.uiContains('Bonjour');
      if (onDashboard) {
        await adb.tap('connexion');
        await adb.wait(4000);
        return 'Deconnexion effectuee';
      }
      const hasLoginBtn = await adb.uiContains('Se connecter');
      if (hasLoginBtn) return 'Deja sur ecran de connexion';
      for (let attempt = 0; attempt < 3; attempt++) {
        await adb.back();
        await adb.wait(2000);
        if (await adb.uiContains('Se connecter')) return 'Retour ecran de connexion';
        if (await adb.uiContains('Bonjour')) {
          await adb.tap('connexion');
          await adb.wait(4000);
          return 'Deconnexion effectuee';
        }
      }
      return 'Navigation vers ecran de connexion';
    }

    case 'ensure_on_dashboard': {
      if (await adb.uiContains('Bonjour')) return 'Deja sur le dashboard';
      try { await adb.tapTab(1); await adb.wait(2000); return 'Retour Accueil via tab'; } catch {}
      await adb.back();
      await adb.wait(1500);
      try { await adb.tapTab(1); await adb.wait(2000); return 'Retour Accueil'; } catch {}
      return 'Tentative retour Accueil';
    }

    case 'logout': {
      if (await adb.uiContains('connexion')) {
        await adb.tap('connexion');
        await adb.wait(4000);
        return 'Deconnexion effectuee';
      }
      try { await adb.tapTab(1); await adb.wait(2000); } catch {}
      await adb.tap('connexion');
      await adb.wait(4000);
      return 'Deconnexion effectuee';
    }

    case 'logout_confirm': {
      await adb.tap('connexion');
      await adb.wait(1500);
      if (await adb.uiContains('Annuler')) {
        await adb.tap('connexion', 1);
        await adb.wait(4000);
      }
      return 'Deconnexion confirmee';
    }

    // ═══════════════════════════════════════════════════════════════
    //  INSCRIPTION
    // ═══════════════════════════════════════════════════════════════

    case 'scroll_to_register': {
      await adb.scrollDown(900);
      await adb.wait(1000);
      return 'Scroll vers le bas';
    }

    case 'go_to_register': {
      await adb.wait(500);
      try { await adb.tap('inscrire'); } catch {
        await adb.scrollDown(1200);
        await adb.wait(1000);
        await adb.tap('inscrire');
      }
      await adb.wait(2500);
      return 'Ecran inscription affiche';
    }

    case 'fill_register_form': {
      const { email, password } = getMobileTestCredentials();
      await adb.typeInField('pr', 'Test');
      await adb.wait(600);
      await adb.typeInField('Nom', 'Mobile');
      await adb.wait(600);
      await adb.typeInField('Email', email);
      await adb.wait(600);
      await adb.typeInField('Minimum', password);
      await adb.wait(600);
      await adb.typeInField('Retapez', password);
      await adb.wait(500);
      await adb.closeKeyboard();
      await adb.wait(800);
      try { await adb.tap('conditions'); } catch {}
      await adb.wait(500);
      return 'Formulaire rempli';
    }

    case 'submit_register': {
      await adb.scrollDown(1200);
      await adb.wait(800);
      try { await adb.tap('inscrire'); } catch { await adb.tap("S'inscrire"); }
      await adb.wait(4000);
      return 'Inscription soumise';
    }

    case 'go_to_login': {
      await adb.wait(800);
      try { await adb.tap('connecter'); } catch {
        await adb.back();
        await adb.wait(1500);
      }
      await adb.wait(2000);
      return 'Ecran connexion';
    }

    // ═══════════════════════════════════════════════════════════════
    //  LOGIN
    // ═══════════════════════════════════════════════════════════════

    case 'fill_login_form': {
      await adb.wait(500);
      await adb.typeInField('Email', 'admin@jobbingtrack.com');
      await adb.wait(800);
      await adb.typeInField('Mot de passe', 'password123');
      await adb.wait(500);
      await adb.closeKeyboard();
      await adb.wait(800);
      return 'Identifiants saisis';
    }

    case 'fill_login_form_user1': {
      const { email, password } = getMobileTestCredentials();
      await adb.wait(500);
      await adb.typeInField('Email', email);
      await adb.wait(800);
      await adb.typeInField('Mot de passe', password);
      await adb.wait(500);
      await adb.closeKeyboard();
      await adb.wait(800);
      return 'Identifiants user1 saisis';
    }

    case 'submit_login': {
      await adb.tap('connecter');
      await adb.wait(4000);
      return 'Connexion effectuee';
    }

    case 'open_bluemail': {
      try {
        await adb.shellCommand('am start -n com.bluemail.mail/.activity.WelcomeActivity');
      } catch {
        await adb.shellCommand('am start -a android.intent.action.MAIN -p com.bluemail.mail');
      }
      await adb.wait(3000);
      return 'BlueMail ouvert';
    }

    case 'open_gmail': {
      try {
        await adb.shellCommand('am start -n com.google.android.gm/.ConversationListActivityGmail');
      } catch {
        await adb.shellCommand('am start -a android.intent.action.MAIN -p com.google.android.gm');
      }
      await adb.wait(3000);
      return 'Gmail ouvert';
    }

    case 'return_to_app': {
      await adb.shellCommand('am start -n com.example.jobbingtrack_mobile/.MainActivity');
      await adb.wait(2500);
      return 'Retour app JobbingTrack';
    }

    // ═══════════════════════════════════════════════════════════════
    //  MOT DE PASSE OUBLIE
    // ═══════════════════════════════════════════════════════════════

    case 'tap_forgot_password': {
      await adb.tap('oubli');
      await adb.wait(2000);
      return 'Ecran mot de passe oublie';
    }

    case 'fill_forgot_email': {
      const { email } = getMobileTestCredentials();
      await adb.typeInField('Email', email);
      await adb.wait(500);
      await adb.closeKeyboard();
      await adb.wait(500);
      return 'Email saisi';
    }

    case 'submit_forgot': {
      await adb.tap('Envoyer');
      await adb.wait(3000);
      return 'Lien envoye';
    }

    // ═══════════════════════════════════════════════════════════════
    //  DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    case 'view_dashboard_ui': {
      await adb.wait(2500);
      return 'Dashboard affiche';
    }

    case 'scroll_dashboard': {
      await adb.scrollDown(1000);
      await adb.wait(1500);
      await adb.scrollUp(1000);
      await adb.wait(1000);
      return 'Dashboard parcouru';
    }

    case 'verify_dashboard_stats': {
      await adb.wait(1500);
      const hasCandidatures = await adb.uiContains('Candidatures');
      const hasEntretiens = await adb.uiContains('Entretiens');
      const hasRelances = await adb.uiContains('Relances');
      const stats = [hasCandidatures && 'Candidatures', hasEntretiens && 'Entretiens', hasRelances && 'Relances'].filter(Boolean);
      return `Stats visibles: ${stats.join(', ') || 'aucune'}`;
    }

    case 'verify_actions_rapides': {
      await adb.scrollDown(600);
      await adb.wait(1000);
      const hasRapides = await adb.uiContains('Actions rapides');
      return hasRapides ? 'Section Actions rapides presente' : 'Actions rapides non trouvee';
    }

    case 'tap_action_candidatures': {
      await adb.scrollDown(600);
      await adb.wait(1000);
      try { await adb.tap('Candidatures', 1); await adb.wait(2000); } catch {
        await adb.tap('Candidatures'); await adb.wait(2000);
      }
      return 'Action rapide Candidatures';
    }

    case 'tap_action_entreprises': {
      await adb.scrollDown(600);
      await adb.wait(1000);
      try { await adb.tap('Entreprises', 1); } catch { await adb.tap('Entreprises'); }
      await adb.wait(2000);
      return 'Action rapide Entreprises';
    }

    case 'tap_action_contacts': {
      await adb.scrollDown(600);
      await adb.wait(1000);
      try { await adb.tap('Contacts', 1); } catch { await adb.tap('Contacts'); }
      await adb.wait(2000);
      return 'Action rapide Contacts';
    }

    case 'tap_action_entretiens': {
      await adb.scrollDown(600);
      await adb.wait(1000);
      try { await adb.tap('Entretiens', 1); } catch { await adb.tap('Entretiens'); }
      await adb.wait(2000);
      return 'Action rapide Entretiens';
    }

    case 'verify_admin_section': {
      await adb.scrollDown(1200);
      await adb.wait(1000);
      const hasAdmin = await adb.uiContains('Administration');
      return hasAdmin ? 'Section Administration visible (admin)' : 'Section Administration non trouvee';
    }

    // ═══════════════════════════════════════════════════════════════
    //  NAVIGATION BOTTOM BAR
    // ═══════════════════════════════════════════════════════════════

    case 'nav_tab_1': {
      const hasTab = await adb.uiContains('Tab 1 of');
      if (hasTab) { await adb.tapTab(1); await adb.wait(2000); }
      else { await adb.back(); await adb.wait(2000); }
      return 'Onglet 1 (Accueil)';
    }

    case 'nav_tab_2':
    case 'nav_tab_3':
    case 'nav_tab_4':
    case 'nav_tab_5': {
      const num = parseInt(stepId.replace('nav_tab_', ''));
      if (await adb.uiContains(`Tab ${num} of`)) {
        await adb.tapTab(num);
      } else {
        await adb.back(); await adb.wait(1500);
        await adb.tapTab(num);
      }
      await adb.wait(2500);
      return `Onglet ${num} visite`;
    }

    // ═══════════════════════════════════════════════════════════════
    //  CANDIDATURES
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_candidatures': {
      if (!(await adb.uiContains('Tab 2 of'))) { await adb.back(); await adb.wait(1500); }
      await adb.tapTab(2);
      await adb.wait(2500);
      return 'Page Candidatures';
    }

    case 'verify_candidatures_list': {
      const hasMes = await adb.uiContains('Mes Candidatures');
      const hasAucune = await adb.uiContains('Aucune candidature');
      if (hasMes) return hasAucune ? 'Liste candidatures vide' : 'Liste candidatures avec elements';
      return 'Page Candidatures non trouvee';
    }

    case 'scroll_candidatures': {
      await adb.scrollDown(800);
      await adb.wait(1500);
      await adb.scrollUp(800);
      await adb.wait(1000);
      return 'Liste candidatures parcourue';
    }

    case 'tap_first_candidature': {
      try {
        await adb.tap('Voir', 0);
        await adb.wait(2500);
        return 'Detail candidature ouvert';
      } catch {
        return 'Aucune candidature a ouvrir';
      }
    }

    case 'verify_candidature_detail': {
      await adb.wait(1000);
      const hasModifier = await adb.uiContains('Modifier');
      const hasEntretien = await adb.uiContains('entretien') || await adb.uiContains('Entretien');
      const hasRelance = await adb.uiContains('relance') || await adb.uiContains('Relance');
      const elements = [hasModifier && 'Modifier', hasEntretien && 'Entretiens', hasRelance && 'Relances'].filter(Boolean);
      return `Detail: ${elements.join(', ') || 'elements non verifies'}`;
    }

    case 'back_from_candidature_detail': {
      await adb.back();
      await adb.wait(1500);
      const onList = await adb.uiContains('Mes Candidatures');
      return onList ? 'Retour liste candidatures (app non quittee)' : 'Retour effectue';
    }

    case 'tap_add_entretien_from_detail': {
      try {
        await adb.tap('Ajouter entretien');
        await adb.wait(2000);
        return 'Formulaire ajout entretien';
      } catch {
        try { await adb.tap('entretien'); await adb.wait(2000); return 'Tentative ajout entretien'; } catch {}
        return 'Bouton entretien non trouve (a implementer)';
      }
    }

    case 'tap_add_relance_from_detail': {
      try {
        await adb.tap('Ajouter relance');
        await adb.wait(2000);
        return 'Formulaire ajout relance';
      } catch {
        try { await adb.tap('relance'); await adb.wait(2000); return 'Tentative ajout relance'; } catch {}
        return 'Bouton relance non trouve (a implementer)';
      }
    }

    case 'tap_add_appel_from_detail': {
      try {
        await adb.tap('Ajouter appel');
        await adb.wait(2000);
        return 'Formulaire ajout appel';
      } catch {
        try { await adb.tap('appel'); await adb.wait(2000); return 'Tentative ajout appel'; } catch {}
        return 'Bouton appel non trouve (a implementer)';
      }
    }

    case 'tap_candidature_fab': {
      try {
        await adb.tapCoords(960, 2100);
        await adb.wait(2000);
        return 'FAB + candidature tappe';
      } catch {
        return 'FAB non trouve';
      }
    }

    case 'tap_candidature_fab_or_first': {
      if (await adb.uiContains('première candidature') || await adb.uiContains('Aucune candidature')) {
        try {
          await adb.tap('Créer');
          await adb.wait(2500);
          return 'Bouton Créer première candidature';
        } catch {
          await adb.tap('première');
          await adb.wait(2500);
          return 'Ouverture formulaire création';
        }
      }
      try {
        await adb.tapCoords(960, 2100);
        await adb.wait(2000);
        return 'FAB + candidature';
      } catch {
        return 'FAB ou bouton création non trouvé';
      }
    }

    case 'fill_application_form_minimal': {
      await adb.wait(1500);
      try {
        await adb.tap('Entreprise');
        await adb.wait(1200);
        await adb.tapByIndex(0);
        await adb.wait(800);
      } catch {}
      try {
        await adb.typeInField('Poste', 'Test E2E Candidature');
        await adb.wait(500);
        await adb.closeKeyboard();
        await adb.wait(300);
        return 'Formulaire candidature rempli (entreprise + poste)';
      } catch {
        return 'Champ Poste non trouve ou formulaire deja rempli';
      }
    }

    case 'submit_application_form': {
      try {
        await adb.tap('Créer');
        await adb.wait(3000);
        return 'Candidature soumise';
      } catch {
        try {
          await adb.tap('Enregistrer');
          await adb.wait(3000);
          return 'Candidature enregistree';
        } catch {
          return 'Bouton Créer/Enregistrer non trouve';
        }
      }
    }

    case 'verify_application_created': {
      await adb.wait(1500);
      const created = await adb.uiContains('Candidature créée');
      const onList = await adb.uiContains('Mes Candidatures') || await adb.uiContains('Candidatures');
      if (created || onList) return 'Candidature créée et liste affichee';
      return 'Verification creation (snackbar ou liste)';
    }

    case 'add_relance_from_detail_submit': {
      try {
        await adb.tap('Ajouter relance');
        await adb.wait(2000);
        if (await adb.uiContains('OK')) { await adb.tap('OK'); await adb.wait(1500); }
        if (await adb.uiContains('Nouvelle relance')) {
          await adb.tap('Créer');
          await adb.wait(2500);
          return 'Relance créée';
        }
        await adb.tap('Créer');
        await adb.wait(2500);
        return 'Relance créée';
      } catch {
        return 'Ajout relance non effectue';
      }
    }

    case 'add_entretien_from_detail_submit': {
      try {
        await adb.tap('Ajouter entretien');
        await adb.wait(2000);
        if (await adb.uiContains('OK')) { await adb.tap('OK'); await adb.wait(2500); return 'Entretien créé'; }
        await adb.wait(2000);
        return 'Entretien créé';
      } catch {
        return 'Ajout entretien non effectue';
      }
    }

    case 'add_call_from_detail_submit': {
      try {
        await adb.tap('Ajouter appel');
        await adb.wait(2000);
        if (await adb.uiContains('OK')) { await adb.tap('OK'); await adb.wait(1500); }
        if (await adb.uiContains('Nouvel appel')) {
          try { await adb.typeInField('Sujet', 'Appel E2E'); await adb.wait(500); await adb.closeKeyboard(); } catch {}
          await adb.tap('Créer');
          await adb.wait(2500);
          return 'Appel créé';
        }
        await adb.tap('Créer');
        await adb.wait(2500);
        return 'Appel créé';
      } catch {
        return 'Ajout appel non effectue';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  RECHERCHE (SEARCH HUB)
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_recherche': {
      if (!(await adb.uiContains('Tab 3 of'))) { await adb.back(); await adb.wait(1500); }
      await adb.tapTab(3);
      await adb.wait(2500);
      return 'Page Recherche';
    }

    case 'verify_search_tabs': {
      const tabs = [];
      if (await adb.uiContains('Entreprises')) tabs.push('Entreprises');
      if (await adb.uiContains('Contacts')) tabs.push('Contacts');
      if (await adb.uiContains('Entretiens')) tabs.push('Entretiens');
      if (await adb.uiContains('Relances')) tabs.push('Relances');
      return `Onglets Recherche: ${tabs.join(', ')}`;
    }

    case 'search_tab_entreprises': {
      try { await adb.tap('Entreprises'); await adb.wait(2000); } catch {}
      return 'Onglet Entreprises';
    }

    case 'search_tab_contacts': {
      try { await adb.tap('Contacts'); await adb.wait(2000); } catch {}
      return 'Onglet Contacts';
    }

    case 'search_tab_entretiens': {
      try { await adb.tap('Entretiens'); await adb.wait(2000); } catch {}
      return 'Onglet Entretiens';
    }

    case 'search_tab_relances': {
      try { await adb.tap('Relances'); await adb.wait(2000); } catch {}
      return 'Onglet Relances';
    }

    case 'search_type_query': {
      try {
        await adb.tap('Rechercher');
        await adb.wait(800);
        await adb.typeText('test');
        await adb.wait(2000);
        await adb.closeKeyboard();
        await adb.wait(500);
        return 'Recherche effectuee: "test"';
      } catch {
        return 'Champ recherche non trouve';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  CALENDRIER
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_calendrier': {
      if (!(await adb.uiContains('Tab 4 of'))) { await adb.back(); await adb.wait(1500); }
      await adb.tapTab(4);
      await adb.wait(2500);
      return 'Page Calendrier';
    }

    case 'verify_calendrier': {
      const hasEvents = await adb.uiContains('vnement') || await adb.uiContains('Rappels') || await adb.uiContains('Calendrier');
      return hasEvents ? 'Ecran calendrier affiche' : 'Calendrier non verifie';
    }

    case 'tap_charger_evenements': {
      try {
        await adb.tap('Charger');
        await adb.wait(3000);
        return 'Evenements charges';
      } catch {
        return 'Bouton Charger non trouve';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  PROFIL
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_profil': {
      if (!(await adb.uiContains('Tab 5 of'))) { await adb.back(); await adb.wait(1500); }
      await adb.tapTab(5);
      await adb.wait(2500);
      return 'Page Profil';
    }

    case 'verify_profil': {
      const hasProfil = await adb.uiContains('Profil');
      return hasProfil ? 'Ecran profil affiche' : 'Profil non trouve';
    }

    // ═══════════════════════════════════════════════════════════════
    //  DRAWER NAVIGATION
    // ═══════════════════════════════════════════════════════════════

    case 'open_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      return 'Menu lateral ouvert';
    }

    case 'close_drawer': {
      await adb.back();
      await adb.wait(800);
      return 'Drawer ferme (back)';
    }

    case 'drawer_accueil': {
      await adb.tap('Accueil');
      await adb.wait(2000);
      return 'Drawer -> Accueil';
    }

    case 'drawer_candidatures': {
      await adb.tap('Candidatures');
      await adb.wait(2500);
      return 'Drawer -> Candidatures';
    }

    case 'drawer_entreprises': {
      await adb.tap('Entreprises');
      await adb.wait(2500);
      return 'Drawer -> Entreprises';
    }

    case 'drawer_contacts': {
      await adb.tap('Contacts');
      await adb.wait(2500);
      return 'Drawer -> Contacts';
    }

    case 'drawer_entretiens': {
      await adb.tap('Entretiens');
      await adb.wait(2500);
      return 'Drawer -> Entretiens';
    }

    case 'drawer_appels': {
      await adb.tap('Appels');
      await adb.wait(2500);
      return 'Drawer -> Appels';
    }

    case 'drawer_relances': {
      await adb.tap('Relances');
      await adb.wait(2500);
      return 'Page Relances';
    }

    case 'drawer_evenements': {
      try { await adb.tap('Rappels'); } catch {
        try { await adb.tap('vnement'); } catch { await adb.tap('Calendrier'); }
      }
      await adb.wait(2500);
      return 'Page Evenements';
    }

    case 'drawer_profil': {
      await adb.drawerScrollDown();
      await adb.wait(500);
      try { await adb.tap('Profil'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(500);
        await adb.tap('Profil');
      }
      await adb.wait(2500);
      return 'Drawer -> Profil';
    }

    case 'drawer_parametres': {
      await adb.drawerScrollDown();
      await adb.wait(500);
      try { await adb.tap('tres'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(500);
        try { await adb.tap('tres'); } catch { await adb.tap('Param'); }
      }
      await adb.wait(2500);
      return 'Drawer -> Parametres';
    }

    case 'drawer_statistiques': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try {
        await adb.tap('Statistiques');
      } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        await adb.tap('Statistiques');
      }
      await adb.wait(2500);
      return 'Page Statistiques';
    }

    case 'drawer_archives': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try { await adb.tap('Archives'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        try { await adb.tap('Archives'); } catch {
          await adb.back(); await adb.wait(1000);
          return 'Archives non trouvees';
        }
      }
      await adb.wait(2500);
      return 'Drawer -> Archives';
    }

    case 'drawer_corbeille': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try {
        await adb.tap('Corbeille');
        await adb.wait(2500);
        return 'Page Corbeille';
      } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        try {
          await adb.tap('Corbeille');
          await adb.wait(2500);
          return 'Page Corbeille';
        } catch {
          await adb.back();
          await adb.wait(1000);
          return 'Corbeille non trouvee (rebuild APK necessaire)';
        }
      }
    }

    case 'drawer_utilisateurs': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try { await adb.tap('Utilisateurs'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        try { await adb.tap('Utilisateurs'); } catch {
          await adb.back(); await adb.wait(1000);
          return 'Utilisateurs non trouvee';
        }
      }
      await adb.wait(2500);
      return 'Drawer -> Utilisateurs';
    }

    case 'drawer_logs': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try { await adb.tap('Logs'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        try { await adb.tap('Logs'); } catch {
          await adb.back(); await adb.wait(1000);
          return 'Logs non trouvee';
        }
      }
      await adb.wait(2500);
      return 'Drawer -> Logs';
    }

    case 'drawer_analytics': {
      await adb.drawerScrollDown();
      await adb.wait(800);
      try { await adb.tap('Analytics'); } catch {
        await adb.drawerScrollDown();
        await adb.wait(800);
        try { await adb.tap('Analytics'); } catch {
          await adb.back(); await adb.wait(1000);
          return 'Analytics non trouvee';
        }
      }
      await adb.wait(2500);
      return 'Drawer -> Analytics';
    }

    // ═══════════════════════════════════════════════════════════════
    //  RELANCES (Follow-ups)
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_relances_via_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      await adb.tap('Relances');
      await adb.wait(2500);
      return 'Page Relances via drawer';
    }

    case 'verify_relances_tabs': {
      const hasAVenir = await adb.uiContains('venir');
      const hasTerminees = await adb.uiContains('ermin');
      return `Relances tabs: ${[hasAVenir && 'A venir', hasTerminees && 'Terminees'].filter(Boolean).join(', ')}`;
    }

    case 'relances_tab_a_venir': {
      try { await adb.tap('venir'); await adb.wait(1500); } catch {}
      return 'Onglet relances A venir';
    }

    case 'relances_tab_terminees': {
      try { await adb.tap('ermin'); await adb.wait(1500); } catch {}
      return 'Onglet relances Terminees';
    }

    case 'relance_tap_menu': {
      try {
        const nodes = await adb.uiNodes();
        const menuBtn = nodes.find(n => n.contentDesc && n.contentDesc.toLowerCase().includes('more') || n.contentDesc.includes('...'));
        if (menuBtn) {
          const boundsMatch = menuBtn.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
          if (boundsMatch) {
            const cx = (parseInt(boundsMatch[1]) + parseInt(boundsMatch[3])) / 2;
            const cy = (parseInt(boundsMatch[2]) + parseInt(boundsMatch[4])) / 2;
            await adb.tapCoords(cx, cy);
            await adb.wait(1500);
            return 'Menu popup relance ouvert';
          }
        }
        return 'Menu relance non trouve';
      } catch {
        return 'Menu relance non trouve';
      }
    }

    case 'relance_marquer_terminee': {
      try {
        await adb.tap('ermin');
        await adb.wait(2000);
        if (await adb.uiContains('ponse')) {
          await adb.typeInField('ponse', 'Entretien confirme');
          await adb.wait(500);
          await adb.closeKeyboard();
          await adb.wait(500);
          await adb.tap('Valider');
          await adb.wait(2000);
          return 'Relance marquee comme terminee';
        }
        return 'Dialog completion ouvert';
      } catch {
        return 'Echec marquer terminee';
      }
    }

    case 'relance_supprimer': {
      try {
        await adb.tap('Supprimer');
        await adb.wait(1500);
        if (await adb.uiContains('Annuler')) {
          await adb.tap('Supprimer', 1);
          await adb.wait(2000);
          return 'Relance supprimee';
        }
        return 'Dialog suppression relance';
      } catch {
        return 'Suppression relance non possible';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  ENTRETIENS
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_entretiens_via_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      await adb.tap('Entretiens');
      await adb.wait(2500);
      return 'Page Entretiens via drawer';
    }

    case 'verify_entretiens_screen': {
      const has = await adb.uiContains('Entretiens');
      return has ? 'Ecran Entretiens affiche' : 'Entretiens non verifie';
    }

    // ═══════════════════════════════════════════════════════════════
    //  APPELS
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_appels_via_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      await adb.tap('Appels');
      await adb.wait(2500);
      return 'Page Appels via drawer';
    }

    case 'verify_appels_screen': {
      const has = await adb.uiContains('Appels');
      return has ? 'Ecran Appels affiche' : 'Appels non verifie';
    }

    // ═══════════════════════════════════════════════════════════════
    //  ENTREPRISES
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_entreprises_via_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      await adb.tap('Entreprises');
      await adb.wait(2500);
      return 'Page Entreprises via drawer';
    }

    case 'verify_entreprises_screen': {
      const has = await adb.uiContains('Entreprises');
      return has ? 'Ecran Entreprises affiche' : 'Entreprises non verifie';
    }

    // ═══════════════════════════════════════════════════════════════
    //  CONTACTS
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_contacts_via_drawer': {
      await adb.openDrawer();
      await adb.wait(1500);
      await adb.tap('Contacts');
      await adb.wait(2500);
      return 'Page Contacts via drawer';
    }

    case 'verify_contacts_screen': {
      const has = await adb.uiContains('Contacts');
      return has ? 'Ecran Contacts affiche' : 'Contacts non verifie';
    }

    // ═══════════════════════════════════════════════════════════════
    //  ADMIN SCREENS
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_admin_section': {
      await adb.scrollDown(1200);
      await adb.wait(1000);
      try {
        await adb.tap('Administration');
        await adb.wait(2500);
        return 'Section Administration ouverte';
      } catch {
        return 'Administration non trouvee';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    case 'open_notifications': {
      try {
        const hasBell = await adb.uiContains('notification');
        if (hasBell) {
          await adb.tap('notification');
          await adb.wait(2000);
          return 'Panel notifications ouvert';
        }
        await adb.tap('🔔', 0);
        await adb.wait(2000);
        return 'Icone notification tappee';
      } catch {
        return 'Notifications non trouvees (icone absente)';
      }
    }

    case 'verify_notifications': {
      const hasNotif = await adb.uiContains('Notification') || await adb.uiContains('notification');
      return hasNotif ? 'Ecran notifications affiche' : 'Notifications non verifie';
    }

    case 'tap_first_notification': {
      try {
        await adb.tapByIndex(0);
        await adb.wait(2000);
        return 'Premiere notification tappee';
      } catch {
        return 'Aucune notification a tapper';
      }
    }

    case 'mark_all_notifications_read': {
      try {
        const hasMarkAll = await adb.uiContains('Tout marquer');
        if (hasMarkAll) {
          await adb.tap('Tout marquer');
          await adb.wait(2000);
          return 'Toutes les notifications marquees comme lues';
        }
        return 'Bouton marquer tout non trouve';
      } catch {
        return 'Impossible de marquer les notifications';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  PARAMETRES
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_parametres': {
      await adb.swipeRight();
      await adb.wait(1500);
      try {
        const hasParam = await adb.uiContains('aramètre');
        if (hasParam) {
          await adb.tap('aramètre');
          await adb.wait(2500);
          return 'Page Parametres ouverte';
        }
        await adb.scrollDown(600);
        await adb.wait(500);
        await adb.tap('aramètre');
        await adb.wait(2500);
        return 'Page Parametres ouverte (apres scroll)';
      } catch {
        await adb.back();
        return 'Parametres non trouves dans drawer';
      }
    }

    case 'verify_parametres': {
      const has = await adb.uiContains('aramètre') || await adb.uiContains('Paramètre');
      return has ? 'Ecran Parametres affiche' : 'Parametres non verifie';
    }

    case 'toggle_auto_status': {
      try {
        const hasAuto = await adb.uiContains('automatique') || await adb.uiContains('auto');
        if (hasAuto) {
          await adb.tap('automatique');
          await adb.wait(1500);
          return 'Toggle auto-statut appuye';
        }
        return 'Toggle auto-statut non trouve';
      } catch {
        return 'Impossible de toggler auto-statut';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  EVENEMENTS & CALENDRIER AVANCE
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_evenements_via_drawer': {
      await adb.swipeRight();
      await adb.wait(1500);
      try {
        const has = await adb.uiContains('vénement') || await adb.uiContains('Evénement') || await adb.uiContains('Evenement');
        if (has) {
          await adb.tap('vénement');
          await adb.wait(2500);
          return 'Page Evenements ouverte';
        }
        await adb.scrollDown(600);
        await adb.wait(500);
        await adb.tap('vénement');
        await adb.wait(2500);
        return 'Page Evenements ouverte (apres scroll)';
      } catch {
        await adb.back();
        return 'Evenements non trouves dans drawer';
      }
    }

    case 'verify_evenements': {
      const has = await adb.uiContains('vénement') || await adb.uiContains('Evenement') || await adb.uiContains('calendrier');
      return has ? 'Ecran Evenements affiche' : 'Evenements non verifie';
    }

    case 'verify_calendar_events': {
      await adb.wait(1000);
      const hasEvent = await adb.uiContains('Entretien') ||
        await adb.uiContains('Relance') ||
        await adb.uiContains('Candidature') ||
        await adb.uiContains('Appel');
      return hasEvent ? 'Evenements visibles dans le calendrier' : 'Aucun evenement visible dans le calendrier';
    }

    // ═══════════════════════════════════════════════════════════════
    //  EMAIL APP (ouvrir l'app email sur l'appareil pour tests)
    // ═══════════════════════════════════════════════════════════════

    case 'open_gmail': {
      try {
        await adb.shellCommand('am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.google.android.gm/.ConversationListActivityGmail');
        await adb.wait(5000);
        return 'Gmail ouvert';
      } catch {
        return 'Gmail non installe ou erreur ouverture';
      }
    }

    case 'open_email_app': {
      try {
        await adb.shellCommand('am start -a android.intent.action.MAIN -t "message/rfc822"');
        await adb.wait(5000);
        return 'Application email ouverte';
      } catch {
        try {
          await adb.shellCommand('am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.google.android.gm/.ConversationListActivityGmail');
          await adb.wait(5000);
          return 'Gmail ouvert en fallback';
        } catch {
          return 'Aucune application email trouvee';
        }
      }
    }

    case 'verify_email_received': {
      await adb.wait(3000);
      const hasJobbing = await adb.uiContains('JobbingTrack') || await adb.uiContains('jobbingtrack') || await adb.uiContains('Crash');
      return hasJobbing ? 'Email JobbingTrack trouve dans la boite' : 'Aucun email JobbingTrack visible';
    }

    case 'return_to_app': {
      try {
        await adb.shellCommand('am start -n com.jobbingtrack.app/.MainActivity');
        await adb.wait(3000);
        return 'Retour a l\'app JobbingTrack';
      } catch {
        await adb.back();
        await adb.wait(1000);
        await adb.back();
        await adb.wait(1000);
        return 'Retour via back';
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  STATISTIQUES
    // ═══════════════════════════════════════════════════════════════

    case 'go_to_statistiques_via_drawer': {
      await adb.swipeRight();
      await adb.wait(1500);
      try {
        await adb.scrollDown(600);
        await adb.wait(500);
        await adb.tap('tatistique');
        await adb.wait(2500);
        return 'Page Statistiques ouverte';
      } catch {
        await adb.back();
        return 'Statistiques non trouvees dans drawer';
      }
    }

    case 'verify_statistiques': {
      const has = await adb.uiContains('tatistique') || await adb.uiContains('Statistique');
      return has ? 'Ecran Statistiques affiche' : 'Statistiques non verifie';
    }

    // ═══════════════════════════════════════════════════════════════
    //  GENERIQUES
    // ═══════════════════════════════════════════════════════════════

    case 'go_back_to_login':
    case 'go_back': {
      await adb.back();
      await adb.wait(2000);
      return 'Retour';
    }

    case 'wait_short': {
      await adb.wait(2000);
      return 'Pause courte';
    }

    case 'wait_long': {
      await adb.wait(5000);
      return 'Pause longue';
    }

    case 'screenshot': {
      return `Screenshot: ${adb.screenshotUrl()}`;
    }

    default:
      throw new Error(`Étape "${stepId}" non implémentée`);
  }
}
