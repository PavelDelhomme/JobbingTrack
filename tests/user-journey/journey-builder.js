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
  view_calendar: stepViewCalendar.stepViewCalendar
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
  view_calendar: 'Voir Calendrier'
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
  ]
};

module.exports = {
  executeJourney,
  STEP_MODULES,
  STEP_NAMES,
  PREDEFINED_JOURNEYS
};

