/**
 * Types affichés dans le centre de notifications utilisateur (mobile + cloche).
 * Exclut crash, erreurs techniques et notifications système — réservées au backoffice.
 */
const IN_APP_NOTIFICATION_TYPES = [
  'REMINDER',
  'APPLICATION_UPDATE',
  'INTERVIEW_SCHEDULED',
  'FOLLOWUP_DUE',
  'DEADLINE',
  'STATUS_CHANGE',
];

const NON_IN_APP_NOTIFICATION_TYPES = [
  'SYSTEM',
  'CRASH_REPORT',
  'ERROR_REPORT',
];

function resolveNotificationScope(query = {}) {
  const scope = String(query.scope || 'in_app').toLowerCase();
  return scope === 'all' ? 'all' : 'in_app';
}

function buildInAppTypeFilter(scope) {
  if (scope === 'all') return {};
  return { type: { in: IN_APP_NOTIFICATION_TYPES } };
}

module.exports = {
  IN_APP_NOTIFICATION_TYPES,
  NON_IN_APP_NOTIFICATION_TYPES,
  resolveNotificationScope,
  buildInAppTypeFilter,
};
