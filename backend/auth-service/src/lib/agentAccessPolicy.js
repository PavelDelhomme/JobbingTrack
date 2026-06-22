const AGENT_FLAG = 'JOB_SEARCH_AGENT_ENABLED';

const CONSENT_TYPES = [
  'MAILBOX_ACCESS',
  'CONTENT_CLASSIFICATION',
  'DIGEST_NOTIFICATIONS',
  'GOOGLE_CALENDAR',
  'GOOGLE_TASKS',
  'AI_PROCESSING',
];

const REQUIRED_BEFORE_MAILBOX = ['MAILBOX_ACCESS'];

function normalizeRole(role) {
  return String(role || 'USER').trim().toUpperCase();
}

function evaluateAgentAccess(user = {}) {
  const role = normalizeRole(user.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || user.isAdmin === true;
  const agentEnabled = user.jobSearchAgentEnabled === true;
  const emailVerified = user.emailVerified !== false;

  if (!emailVerified) {
    return {
      allowed: false,
      reason: 'email_not_verified',
      canConnectMailbox: false,
      canReadMailbox: false,
    };
  }

  if (!agentEnabled) {
    return {
      allowed: false,
      reason: 'job_search_agent_disabled',
      canConnectMailbox: false,
      canReadMailbox: false,
    };
  }

  if (isAdmin && user.requestingPersonalEmailContent === true) {
    return {
      allowed: false,
      reason: 'admin_cannot_read_personal_email_without_user_consent',
      canConnectMailbox: false,
      canReadMailbox: false,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    canConnectMailbox: true,
    canReadMailbox: !isAdmin || user.personalEmailConsentGranted === true,
  };
}

function hasRequiredConsents(consents = []) {
  const granted = new Set(
    consents.filter((c) => c.granted).map((c) => c.consentType),
  );
  return REQUIRED_BEFORE_MAILBOX.every((type) => granted.has(type));
}

module.exports = {
  AGENT_FLAG,
  CONSENT_TYPES,
  REQUIRED_BEFORE_MAILBOX,
  evaluateAgentAccess,
  hasRequiredConsents,
};
