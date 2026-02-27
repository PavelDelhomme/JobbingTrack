/**
 * Definitions des scenarios (parcours utilisateur) pour l'app mobile.
 * Chaque scenario contient une liste d'etapes referencant des step IDs
 * implementes dans adb-steps.ts
 */

export interface MobileScenario {
  name: string;
  description: string;
  category: 'auth' | 'navigation' | 'crud' | 'verification' | 'complet';
  steps: string[];
}

export const MOBILE_SCENARIOS: Record<string, MobileScenario> = {

  // ═══════════════════════════════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════════════════════════════

  mobile_login_quick: {
    name: 'Login rapide',
    description: 'Deconnexion si besoin -> saisir identifiants -> connexion -> dashboard',
    category: 'auth',
    steps: ['ensure_logged_out', 'fill_login_form', 'submit_login', 'view_dashboard_ui'],
  },
  mobile_registration: {
    name: 'Inscription complete',
    description: 'Deconnexion -> inscription -> formulaire -> login -> dashboard',
    category: 'auth',
    steps: ['ensure_logged_out', 'scroll_to_register', 'go_to_register', 'fill_register_form', 'submit_register', 'go_to_login', 'fill_login_form', 'submit_login', 'view_dashboard_ui'],
  },
  mobile_password_reset: {
    name: 'Reset mot de passe',
    description: 'Deconnexion -> mot de passe oublie -> email -> retour',
    category: 'auth',
    steps: ['ensure_logged_out', 'tap_forgot_password', 'fill_forgot_email', 'submit_forgot', 'go_back_to_login'],
  },
  mobile_login_logout: {
    name: 'Login + Deconnexion',
    description: 'Cycle complet connexion -> dashboard -> deconnexion',
    category: 'auth',
    steps: ['ensure_logged_out', 'fill_login_form', 'submit_login', 'view_dashboard_ui', 'wait_short', 'logout'],
  },

  // ═══════════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  mobile_nav_bottom_bar: {
    name: 'Navigation bottom bar',
    description: 'Parcourir les 5 onglets de la bottom navigation',
    category: 'navigation',
    steps: ['ensure_on_dashboard', 'nav_tab_2', 'nav_tab_3', 'nav_tab_4', 'nav_tab_5', 'nav_tab_1'],
  },
  mobile_nav_drawer_all: {
    name: 'Drawer complet',
    description: 'Ouvrir le drawer et visiter chaque section',
    category: 'navigation',
    steps: [
      'ensure_on_dashboard',
      'open_drawer', 'drawer_candidatures', 'go_back',
      'open_drawer', 'drawer_entreprises', 'go_back',
      'open_drawer', 'drawer_contacts', 'go_back',
      'open_drawer', 'drawer_entretiens', 'go_back',
      'open_drawer', 'drawer_appels', 'go_back',
      'open_drawer', 'drawer_relances', 'go_back',
      'open_drawer', 'drawer_evenements', 'go_back',
    ],
  },
  mobile_nav_drawer_admin: {
    name: 'Drawer sections admin',
    description: 'Visiter les sections admin du drawer (Analytics, Stats, Users, Logs, Corbeille)',
    category: 'navigation',
    steps: [
      'ensure_on_dashboard',
      'open_drawer', 'drawer_analytics', 'go_back',
      'open_drawer', 'drawer_statistiques', 'go_back',
      'open_drawer', 'drawer_utilisateurs', 'go_back',
      'open_drawer', 'drawer_logs', 'go_back',
      'open_drawer', 'drawer_corbeille', 'go_back',
    ],
  },
  mobile_nav_complete: {
    name: 'Navigation complete',
    description: 'Bottom bar + drawer complet',
    category: 'navigation',
    steps: [
      'ensure_on_dashboard',
      'nav_tab_2', 'nav_tab_3', 'nav_tab_4', 'nav_tab_5', 'nav_tab_1',
      'open_drawer', 'drawer_candidatures', 'go_back',
      'open_drawer', 'drawer_entreprises', 'go_back',
      'open_drawer', 'drawer_contacts', 'go_back',
      'open_drawer', 'drawer_entretiens', 'go_back',
      'open_drawer', 'drawer_appels', 'go_back',
      'open_drawer', 'drawer_relances', 'go_back',
      'open_drawer', 'drawer_evenements', 'go_back',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  VERIFICATION ECRANS
  // ═══════════════════════════════════════════════════════════════

  mobile_verify_dashboard: {
    name: 'Verification dashboard',
    description: 'Verifier stats, actions rapides, section admin',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'verify_dashboard_stats',
      'verify_actions_rapides',
      'scroll_dashboard',
      'verify_admin_section',
    ],
  },
  mobile_verify_candidatures: {
    name: 'Verification candidatures',
    description: 'Aller sur les candidatures, verifier la liste, ouvrir un detail',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_candidatures',
      'verify_candidatures_list',
      'scroll_candidatures',
      'tap_first_candidature',
      'verify_candidature_detail',
      'go_back',
    ],
  },
  mobile_verify_search_hub: {
    name: 'Verification hub recherche',
    description: 'Explorer tous les onglets du hub recherche + lancer une recherche',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_recherche',
      'verify_search_tabs',
      'search_tab_entreprises',
      'search_tab_contacts',
      'search_tab_entretiens',
      'search_tab_relances',
      'search_type_query',
      'go_back',
    ],
  },
  mobile_verify_calendrier: {
    name: 'Verification calendrier',
    description: 'Ouvrir le calendrier et charger les evenements',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_calendrier',
      'verify_calendrier',
      'tap_charger_evenements',
      'go_back',
    ],
  },
  mobile_verify_profil: {
    name: 'Verification profil',
    description: 'Ouvrir le profil et verifier l\'ecran',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_profil',
      'verify_profil',
      'go_back',
    ],
  },
  mobile_verify_relances: {
    name: 'Verification relances',
    description: 'Ouvrir les relances via drawer, verifier les tabs A venir et Terminees',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_relances_via_drawer',
      'verify_relances_tabs',
      'relances_tab_a_venir',
      'relances_tab_terminees',
      'go_back',
    ],
  },
  mobile_verify_all_screens: {
    name: 'Verification tous ecrans',
    description: 'Ouvrir et verifier chaque ecran de l\'app',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'verify_dashboard_stats',
      'go_to_candidatures', 'verify_candidatures_list', 'go_back',
      'go_to_recherche', 'verify_search_tabs', 'go_back',
      'go_to_calendrier', 'verify_calendrier', 'go_back',
      'go_to_profil', 'verify_profil', 'go_back',
      'go_to_relances_via_drawer', 'verify_relances_tabs', 'go_back',
      'go_to_entretiens_via_drawer', 'verify_entretiens_screen', 'go_back',
      'go_to_appels_via_drawer', 'verify_appels_screen', 'go_back',
      'go_to_entreprises_via_drawer', 'verify_entreprises_screen', 'go_back',
      'go_to_contacts_via_drawer', 'verify_contacts_screen', 'go_back',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  CRUD / INTERACTIONS
  // ═══════════════════════════════════════════════════════════════

  mobile_crud_candidature: {
    name: 'CRUD Candidature',
    description: 'Liste -> detail -> ajout entretien/relance/appel',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'go_to_candidatures',
      'verify_candidatures_list',
      'tap_first_candidature',
      'verify_candidature_detail',
      'scroll_dashboard',
      'tap_add_entretien_from_detail',
      'go_back',
      'tap_add_relance_from_detail',
      'go_back',
      'tap_add_appel_from_detail',
      'go_back',
      'go_back',
    ],
  },
  mobile_crud_relance: {
    name: 'Gestion relances',
    description: 'Lister -> tabs -> marquer terminee',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'go_to_relances_via_drawer',
      'verify_relances_tabs',
      'relances_tab_a_venir',
      'relance_tap_menu',
      'relance_marquer_terminee',
      'go_back',
    ],
  },
  mobile_dashboard_actions: {
    name: 'Actions rapides dashboard',
    description: 'Tester les liens rapides du dashboard',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'verify_actions_rapides',
      'tap_action_candidatures', 'go_back',
      'tap_action_entreprises', 'go_back',
      'tap_action_contacts', 'go_back',
      'tap_action_entretiens', 'go_back',
    ],
  },
  mobile_crud_archive_corbeille: {
    name: 'Archives & Corbeille',
    description: 'Visiter les pages Archives et Corbeille via le drawer',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'open_drawer', 'drawer_archives', 'go_back',
      'open_drawer', 'drawer_corbeille', 'go_back',
    ],
  },
  mobile_crud_notifications: {
    name: 'Gestion notifications',
    description: 'Ouvrir notifications, tapper, marquer lues',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'open_notifications',
      'verify_notifications',
      'tap_first_notification',
      'go_back',
      'open_notifications',
      'mark_all_notifications_read',
      'go_back',
    ],
  },
  mobile_test_email: {
    name: 'Test email sur appareil',
    description: 'Ouvrir app email, verifier reception, retour app',
    category: 'crud',
    steps: [
      'ensure_on_dashboard',
      'open_email_app',
      'wait_long',
      'verify_email_received',
      'return_to_app',
      'wait_short',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  STATUT & VERIFICATION METIER
  // ═══════════════════════════════════════════════════════════════

  mobile_verify_status_badges: {
    name: 'Verification badges statut',
    description: 'Verifier que les candidatures affichent des badges de statut corrects',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_candidatures',
      'verify_candidatures_list',
      'scroll_candidatures',
      'tap_first_candidature',
      'verify_candidature_detail',
      'go_back',
      'go_back',
    ],
  },
  mobile_verify_notifications: {
    name: 'Verification notifications',
    description: 'Ouvrir et verifier les notifications, marquer comme lues',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'open_notifications',
      'verify_notifications',
      'mark_all_notifications_read',
      'go_back',
    ],
  },
  mobile_verify_parametres: {
    name: 'Verification parametres',
    description: 'Ouvrir et verifier l\'ecran parametres',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_parametres',
      'verify_parametres',
      'go_back',
    ],
  },
  mobile_verify_evenements: {
    name: 'Verification evenements',
    description: 'Verifier la page evenements et le calendrier',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_evenements_via_drawer',
      'verify_evenements',
      'go_back',
      'go_to_calendrier',
      'verify_calendrier',
      'verify_calendar_events',
      'go_back',
    ],
  },
  mobile_verify_statistiques: {
    name: 'Verification statistiques',
    description: 'Ouvrir et verifier l\'ecran statistiques',
    category: 'verification',
    steps: [
      'ensure_on_dashboard',
      'go_to_statistiques_via_drawer',
      'verify_statistiques',
      'go_back',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  PARCOURS COMPLETS
  // ═══════════════════════════════════════════════════════════════

  mobile_first_use: {
    name: 'Premiere utilisation',
    description: 'Login -> dashboard -> exploration bottom bar + recherche',
    category: 'complet',
    steps: [
      'ensure_logged_out', 'fill_login_form', 'submit_login',
      'view_dashboard_ui', 'verify_dashboard_stats',
      'nav_tab_2', 'verify_candidatures_list',
      'nav_tab_3', 'verify_search_tabs',
      'nav_tab_4', 'verify_calendrier',
      'nav_tab_5', 'verify_profil',
      'nav_tab_1',
    ],
  },
  mobile_daily_use: {
    name: 'Usage quotidien',
    description: 'Login -> dashboard -> candidatures -> recherche -> calendrier -> relances',
    category: 'complet',
    steps: [
      'ensure_logged_out', 'fill_login_form', 'submit_login',
      'view_dashboard_ui',
      'go_to_candidatures', 'scroll_candidatures', 'tap_first_candidature', 'verify_candidature_detail', 'go_back',
      'go_to_recherche', 'search_tab_entreprises', 'search_tab_contacts',
      'go_to_calendrier', 'tap_charger_evenements',
      'nav_tab_1',
      'go_to_relances_via_drawer', 'verify_relances_tabs',
      'go_back',
    ],
  },
  mobile_complete: {
    name: 'Parcours complet',
    description: 'Login -> dashboard -> tous onglets -> drawer complet -> notifications -> parametres -> deconnexion',
    category: 'complet',
    steps: [
      'ensure_logged_out', 'fill_login_form', 'submit_login',
      'view_dashboard_ui', 'verify_dashboard_stats', 'scroll_dashboard',
      'nav_tab_2', 'verify_candidatures_list', 'scroll_candidatures', 'tap_first_candidature', 'go_back',
      'nav_tab_3', 'verify_search_tabs', 'search_tab_entreprises', 'search_tab_contacts',
      'nav_tab_4', 'verify_calendrier', 'verify_calendar_events',
      'nav_tab_5', 'verify_profil',
      'nav_tab_1',
      'open_notifications', 'verify_notifications', 'go_back',
      'open_drawer', 'drawer_candidatures', 'go_back',
      'open_drawer', 'drawer_entreprises', 'go_back',
      'open_drawer', 'drawer_contacts', 'go_back',
      'open_drawer', 'drawer_entretiens', 'go_back',
      'open_drawer', 'drawer_appels', 'go_back',
      'open_drawer', 'drawer_relances', 'verify_relances_tabs', 'go_back',
      'open_drawer', 'drawer_evenements', 'verify_evenements', 'go_back',
      'open_drawer', 'drawer_parametres', 'verify_parametres', 'go_back',
      'open_drawer', 'drawer_statistiques', 'verify_statistiques', 'go_back',
      'open_drawer', 'drawer_archives', 'go_back',
      'open_drawer', 'drawer_corbeille', 'go_back',
      'nav_tab_1', 'logout',
    ],
  },
};

export const SCENARIO_CATEGORIES = {
  auth: { label: 'Authentification', color: 'indigo' },
  navigation: { label: 'Navigation', color: 'blue' },
  crud: { label: 'CRUD & Interactions', color: 'emerald' },
  verification: { label: 'Verification', color: 'purple' },
  complet: { label: 'Parcours complets', color: 'amber' },
} as const;

export const STEP_LABELS: Record<string, string> = {
  // Auth
  ensure_logged_out: 'Deconnexion si necessaire',
  ensure_on_dashboard: 'Retour dashboard',
  logout: 'Deconnexion',
  logout_confirm: 'Confirmer deconnexion',

  // Inscription
  scroll_to_register: 'Scroll vers inscription',
  go_to_register: 'Aller a Inscription',
  fill_register_form: 'Remplir formulaire inscription',
  submit_register: 'Valider inscription',
  go_to_login: 'Retour Connexion',

  // Login
  fill_login_form: 'Saisir email + mot de passe',
  submit_login: 'Tap Se connecter',

  // Forgot password
  tap_forgot_password: 'Tap Mot de passe oublie',
  fill_forgot_email: 'Saisir email reset',
  submit_forgot: 'Envoyer lien reset',

  // Dashboard
  view_dashboard_ui: 'Verifier dashboard',
  scroll_dashboard: 'Scroll dashboard',
  verify_dashboard_stats: 'Verifier statistiques',
  verify_actions_rapides: 'Verifier Actions rapides',
  tap_action_candidatures: 'Action rapide -> Candidatures',
  tap_action_entreprises: 'Action rapide -> Entreprises',
  tap_action_contacts: 'Action rapide -> Contacts',
  tap_action_entretiens: 'Action rapide -> Entretiens',
  verify_admin_section: 'Verifier section Administration',

  // Bottom bar
  nav_tab_1: 'Onglet 1 (Accueil)',
  nav_tab_2: 'Onglet 2 (Candidatures)',
  nav_tab_3: 'Onglet 3 (Recherche)',
  nav_tab_4: 'Onglet 4 (Calendrier)',
  nav_tab_5: 'Onglet 5 (Profil)',

  // Candidatures
  go_to_candidatures: 'Aller aux Candidatures',
  verify_candidatures_list: 'Verifier liste candidatures',
  scroll_candidatures: 'Scroll liste candidatures',
  tap_first_candidature: 'Ouvrir 1ere candidature',
  verify_candidature_detail: 'Verifier detail candidature',
  tap_add_entretien_from_detail: 'Ajouter entretien (depuis detail)',
  tap_add_relance_from_detail: 'Ajouter relance (depuis detail)',
  tap_add_appel_from_detail: 'Ajouter appel (depuis detail)',
  tap_candidature_fab: 'Tap FAB + candidature',

  // Recherche
  go_to_recherche: 'Aller a Recherche',
  verify_search_tabs: 'Verifier onglets recherche',
  search_tab_entreprises: 'Recherche -> Entreprises',
  search_tab_contacts: 'Recherche -> Contacts',
  search_tab_entretiens: 'Recherche -> Entretiens',
  search_tab_relances: 'Recherche -> Relances',
  search_type_query: 'Saisir recherche',

  // Calendrier
  go_to_calendrier: 'Aller au Calendrier',
  verify_calendrier: 'Verifier ecran calendrier',
  tap_charger_evenements: 'Charger evenements',

  // Profil
  go_to_profil: 'Aller au Profil',
  verify_profil: 'Verifier ecran profil',

  // Drawer
  open_drawer: 'Ouvrir menu lateral',
  drawer_accueil: 'Drawer -> Accueil',
  drawer_candidatures: 'Drawer -> Candidatures',
  drawer_entreprises: 'Drawer -> Entreprises',
  drawer_contacts: 'Drawer -> Contacts',
  drawer_entretiens: 'Drawer -> Entretiens',
  drawer_appels: 'Drawer -> Appels',
  drawer_relances: 'Drawer -> Relances',
  drawer_evenements: 'Drawer -> Evenements',
  drawer_profil: 'Drawer -> Profil',
  drawer_parametres: 'Drawer -> Parametres',
  drawer_statistiques: 'Drawer -> Statistiques',
  drawer_archives: 'Drawer -> Archives',
  drawer_corbeille: 'Drawer -> Corbeille',
  drawer_utilisateurs: 'Drawer -> Utilisateurs',
  drawer_logs: 'Drawer -> Logs',
  drawer_analytics: 'Drawer -> Analytics',

  // Relances
  go_to_relances_via_drawer: 'Relances via drawer',
  verify_relances_tabs: 'Verifier tabs relances',
  relances_tab_a_venir: 'Relances -> A venir',
  relances_tab_terminees: 'Relances -> Terminees',
  relance_tap_menu: 'Menu popup relance',
  relance_marquer_terminee: 'Marquer relance terminee',
  relance_supprimer: 'Supprimer relance',

  // Entretiens
  go_to_entretiens_via_drawer: 'Entretiens via drawer',
  verify_entretiens_screen: 'Verifier ecran entretiens',

  // Appels
  go_to_appels_via_drawer: 'Appels via drawer',
  verify_appels_screen: 'Verifier ecran appels',

  // Entreprises
  go_to_entreprises_via_drawer: 'Entreprises via drawer',
  verify_entreprises_screen: 'Verifier ecran entreprises',

  // Contacts
  go_to_contacts_via_drawer: 'Contacts via drawer',
  verify_contacts_screen: 'Verifier ecran contacts',

  // Admin
  go_to_admin_section: 'Ouvrir Administration',

  // Notifications
  open_notifications: 'Ouvrir notifications',
  verify_notifications: 'Verifier ecran notifications',
  tap_first_notification: 'Tapper premiere notification',
  mark_all_notifications_read: 'Marquer toutes comme lues',

  // Parametres
  go_to_parametres: 'Aller aux Parametres',
  verify_parametres: 'Verifier ecran Parametres',
  toggle_auto_status: 'Toggle auto-statut',

  // Evenements
  go_to_evenements_via_drawer: 'Evenements via drawer',
  verify_evenements: 'Verifier ecran Evenements',
  verify_calendar_events: 'Verifier evenements calendrier',

  // Email app (tests email sur appareil)
  open_gmail: 'Ouvrir Gmail',
  open_email_app: 'Ouvrir application email',
  verify_email_received: 'Verifier reception email',
  return_to_app: 'Retourner a JobbingTrack',

  // Statistiques
  go_to_statistiques_via_drawer: 'Statistiques via drawer',
  verify_statistiques: 'Verifier ecran Statistiques',

  // Generique
  go_back_to_login: 'Retour connexion',
  go_back: 'Retour arriere',
  wait_short: 'Pause courte (2s)',
  wait_long: 'Pause longue (5s)',
  screenshot: 'Capture ecran',
};
