/**
 * Constructeur de Parcours Utilisateur Personnalisé
 * Description : Permet de construire et exécuter des parcours personnalisés étape par étape
 */

const stepRegister = require('./modules/step-register');
const stepEmailValidation = require('./modules/step-email-validation');
const stepLogin = require('./modules/step-login');
const stepProfile = require('./modules/step-profile');
const stepApplicationWithCompany = require('./modules/step-application-with-company');
const stepContactToApplication = require('./modules/step-contact-to-application');
const stepFollowup = require('./modules/step-followup');
const stepInterview = require('./modules/step-interview');
const stepCall = require('./modules/step-call');
const stepApplicationStatus = require('./modules/step-application-status');
const stepApplicationRejected = require('./modules/step-application-rejected');
const stepCreateCompanies = require('./modules/step-create-companies');
const stepCreateApplications = require('./modules/step-create-applications');
const stepCreateContacts = require('./modules/step-create-contacts');
const stepUpdateCompanies = require('./modules/step-update-companies');
const stepUpdateApplications = require('./modules/step-update-applications');
const stepUpdateContacts = require('./modules/step-update-contacts');
const stepListNotifications = require('./modules/step-list-notifications');
const stepCreateEvents = require('./modules/step-create-events');
const stepViewStatistics = require('./modules/step-view-statistics');
const stepViewCalendar = require('./modules/step-view-calendar');
const stepViewDashboard = require('./modules/step-view-dashboard');
const stepSearchHub = require('./modules/step-search-hub');
const stepApplicationDetail = require('./modules/step-application-detail');
const stepArchiveRestore = require('./modules/step-archive-restore');
const stepPasswordReset = require('./modules/step-password-reset');
const stepUpdateProfileSettings = require('./modules/step-update-profile-settings');

// Mapping des étapes disponibles
const STEP_MODULES = {
  register: stepRegister.stepRegister,
  email_validation: stepEmailValidation.stepEmailValidation,
  login: stepLogin.stepLogin,
  profile: stepProfile.stepProfile,
  application_with_company: stepApplicationWithCompany.stepApplicationWithCompany,
  contact_to_application: stepContactToApplication.stepContactToApplication,
  followup: stepFollowup.stepFollowup,
  interview: stepInterview.stepInterview,
  call_company: (options) => stepCall.stepCall({ ...options, callType: 'COMPANY' }),
  call_contact: (options) => stepCall.stepCall({ ...options, callType: 'CONTACT' }),
  application_status: stepApplicationStatus.stepApplicationStatus,
  application_rejected: stepApplicationRejected.stepApplicationRejected,
  create_companies: stepCreateCompanies.stepCreateCompanies,
  create_applications: stepCreateApplications.stepCreateApplications,
  create_contacts: stepCreateContacts.stepCreateContacts,
  create_events: stepCreateEvents.stepCreateEvents,
  view_statistics: stepViewStatistics.stepViewStatistics,
  view_calendar: stepViewCalendar.stepViewCalendar,
  view_dashboard: stepViewDashboard.stepViewDashboard,
  search_hub: stepSearchHub.stepSearchHub,
  application_detail: stepApplicationDetail.stepApplicationDetail,
  archive_restore: stepArchiveRestore.stepArchiveRestore,
  password_reset: stepPasswordReset.stepPasswordReset,
  update_profile_settings: stepUpdateProfileSettings.stepUpdateProfileSettings,
  update_companies: stepUpdateCompanies?.stepUpdateCompanies,
  update_applications: stepUpdateApplications?.stepUpdateApplications,
  update_contacts: stepUpdateContacts?.stepUpdateContacts,
  list_notifications: stepListNotifications?.stepListNotifications
};

// Noms des étapes pour l'affichage
const STEP_NAMES = {
  register: 'Inscription',
  email_validation: 'Validation Email',
  login: 'Connexion',
  profile: 'Profil Utilisateur',
  application_with_company: 'Candidature avec Entreprise',
  contact_to_application: 'Contact à Candidature',
  followup: 'Relance',
  interview: 'Entretien',
  call_company: 'Appel Entreprise',
  call_contact: 'Appel Contact',
  application_status: 'Statut Candidature',
  application_rejected: 'Candidature Rejetée',
  create_companies: 'Créer Entreprises',
  create_applications: 'Créer Candidatures',
  create_contacts: 'Créer Contacts',
  update_companies: 'Mise à jour Entreprises',
  update_applications: 'Mise à jour Candidatures',
  update_contacts: 'Mise à jour Contacts',
  list_notifications: 'Liste Notifications',
  create_events: 'Créer Événements',
  view_statistics: 'Voir Statistiques',
  view_calendar: 'Voir Calendrier',
  view_dashboard: 'Dashboard Utilisateur',
  search_hub: 'Hub Recherche (6 onglets)',
  application_detail: 'Détail Candidature',
  archive_restore: 'Archivage & Restauration',
  password_reset: 'Réinitialisation Mot de Passe',
  update_profile_settings: 'Profil & Paramètres'
};

/**
 * Exécute un parcours personnalisé
 * @param {Array} steps - Liste des étapes à exécuter [{ step: 'register', options: {...} }, ...]
 * @param {Object} globalOptions - Options globales (token, email, etc.)
 * @returns {Promise<Object>} Résultat du parcours
 */
async function executeJourney(steps, globalOptions = {}) {
  const startTime = Date.now();
  const results = [];
  let context = {
    token: globalOptions.token || null,
    email: globalOptions.email || null,
    password: globalOptions.password || null,
    userId: null,
    applicationId: null,
    companyId: null,
    contactId: null,
    interviewId: null,
    ...globalOptions.context
  };

  console.log(`\n🚀 Démarrage du parcours personnalisé (${steps.length} étapes)\n`);

  for (let i = 0; i < steps.length; i++) {
    const stepConfig = steps[i];
    const stepName = stepConfig.step;
    const stepOptions = { ...stepConfig.options || {}, ...context };

    console.log(`\n[${i + 1}/${steps.length}] Exécution: ${STEP_NAMES[stepName] || stepName}`);

    if (!STEP_MODULES[stepName]) {
      const errorResult = {
        step: stepName,
        name: STEP_NAMES[stepName] || stepName,
        status: 'error',
        error: `Module d'étape non trouvé: ${stepName}`,
        message: `❌ Étape inconnue: ${stepName}`
      };
      results.push(errorResult);
      continue;
    }

    try {
      const stepResult = await STEP_MODULES[stepName](stepOptions);
      results.push(stepResult);

      // Mettre à jour le contexte avec les données de l'étape
      if (stepResult.data) {
        if (stepResult.data.token) context.token = stepResult.data.token;
        if (stepResult.data.userId) context.userId = stepResult.data.userId;
        if (stepResult.data.email) context.email = stepResult.data.email;
        if (stepResult.data.applicationId) context.applicationId = stepResult.data.applicationId;
        if (stepResult.data.companyId) context.companyId = stepResult.data.companyId;
        if (stepResult.data.contactId) context.contactId = stepResult.data.contactId;
        if (stepResult.data.interviewId) context.interviewId = stepResult.data.interviewId;
      }

      // Afficher le résultat
      console.log(`   ${stepResult.message || stepResult.status}`);
      if (stepResult.verifications) {
        stepResult.verifications.forEach(v => {
          console.log(`   ${v.message}`);
        });
      }
    } catch (error) {
      const errorResult = {
        step: stepName,
        name: STEP_NAMES[stepName] || stepName,
        status: 'error',
        error: error.message,
        message: `❌ Erreur lors de l'exécution: ${error.message}`
      };
      results.push(errorResult);
      console.log(`   ${errorResult.message}`);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  const summary = {
    totalSteps: steps.length,
    successCount,
    errorCount,
    warningCount,
    skippedCount,
    totalDuration,
    results,
    context
  };

  console.log(`\n\n📊 Résumé du parcours:`);
  console.log(`   ✅ Réussis: ${successCount}`);
  console.log(`   ❌ Échoués: ${errorCount}`);
  console.log(`   ⚠️  Avertissements: ${warningCount}`);
  console.log(`   ⏭️  Ignorés: ${skippedCount}`);
  console.log(`   ⏱️  Durée totale: ${totalDuration}ms\n`);

  return summary;
}

/**
 * Parcours prédéfinis
 */
const PREDEFINED_JOURNEYS = {
  complete: [
    { step: 'register' },
    { step: 'email_validation' },
    { step: 'login' },
    { step: 'profile' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'followup' },
    { step: 'interview' },
    { step: 'call_company' },
    { step: 'application_status', options: { newStatus: 'INTERVIEW_SCHEDULED' } },
    { step: 'call_contact' },
    { step: 'application_status', options: { newStatus: 'OFFER_PENDING' } }
  ],
  registration_flow: [
    { step: 'register' },
    { step: 'email_validation' },
    { step: 'login' },
    { step: 'profile' }
  ],
  application_flow: [
    { step: 'login' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'followup' },
    { step: 'interview' },
    { step: 'application_status', options: { newStatus: 'INTERVIEW_SCHEDULED' } }
  ],
  rejection_flow: [
    { step: 'login' },
    { step: 'application_with_company' },
    { step: 'interview' },
    { step: 'application_rejected' }
  ],
  call_flow: [
    { step: 'login' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'call_company' },
    { step: 'call_contact' }
  ],

  // ===== PARCOURS MOBILE (Vision section 9 FONCTIONNALITES.md) =====

  // 9.1-9.2 Inscription complète : register + validation email + login
  mobile_registration: [
    { step: 'register' },
    { step: 'email_validation' },
    { step: 'login' },
    { step: 'view_dashboard' },
    { step: 'update_profile_settings' }
  ],

  // 9.3 Mot de passe oublié : demande reset, email MailHog, validation token
  mobile_password_reset: [
    { step: 'login' },
    { step: 'password_reset' }
  ],

  // 9.4-9.5 Première utilisation : dashboard → hub recherche → créer candidature
  mobile_first_use: [
    { step: 'login' },
    { step: 'view_dashboard' },
    { step: 'search_hub' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'application_detail' },
    { step: 'view_calendar' }
  ],

  // 9.4-9.7 Usage quotidien : dashboard → navigation → ajout entretien → calendrier
  mobile_daily_use: [
    { step: 'login' },
    { step: 'view_dashboard' },
    { step: 'search_hub' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'followup' },
    { step: 'interview' },
    { step: 'call_company' },
    { step: 'application_detail' },
    { step: 'application_status', options: { newStatus: 'INTERVIEW_SCHEDULED' } },
    { step: 'view_calendar' },
    { step: 'list_notifications' }
  ],

  // 9.5 Swipe archivage/corbeille/restauration
  mobile_archive_trash: [
    { step: 'login' },
    { step: 'application_with_company' },
    { step: 'archive_restore' }
  ],

  // 9.4-9.9 Parcours mobile complet : toutes les fonctionnalités
  mobile_complete: [
    { step: 'register' },
    { step: 'email_validation' },
    { step: 'login' },
    { step: 'view_dashboard' },
    { step: 'update_profile_settings' },
    { step: 'search_hub' },
    { step: 'create_companies' },
    { step: 'application_with_company' },
    { step: 'contact_to_application' },
    { step: 'followup' },
    { step: 'interview' },
    { step: 'call_company' },
    { step: 'call_contact' },
    { step: 'application_detail' },
    { step: 'application_status', options: { newStatus: 'INTERVIEW_SCHEDULED' } },
    { step: 'archive_restore' },
    { step: 'create_events' },
    { step: 'view_calendar' },
    { step: 'view_statistics' },
    { step: 'list_notifications' },
    { step: 'search_hub' }
  ],

  // Parcours admin backoffice : CRUD complet + sécurité
  admin_backoffice: [
    { step: 'login' },
    { step: 'view_dashboard' },
    { step: 'create_companies' },
    { step: 'create_applications' },
    { step: 'create_contacts' },
    { step: 'create_events' },
    { step: 'update_companies' },
    { step: 'update_applications' },
    { step: 'update_contacts' },
    { step: 'search_hub' },
    { step: 'view_statistics' },
    { step: 'view_calendar' },
    { step: 'list_notifications' }
  ],

  // Parcours données massives : création bulk + navigation
  data_stress: [
    { step: 'login' },
    { step: 'create_companies', options: { count: 5 } },
    { step: 'create_applications', options: { count: 5 } },
    { step: 'create_contacts', options: { count: 5 } },
    { step: 'create_events', options: { count: 5 } },
    { step: 'search_hub' },
    { step: 'view_dashboard' },
    { step: 'view_statistics' }
  ]
};

module.exports = {
  executeJourney,
  STEP_MODULES,
  STEP_NAMES,
  PREDEFINED_JOURNEYS
};

