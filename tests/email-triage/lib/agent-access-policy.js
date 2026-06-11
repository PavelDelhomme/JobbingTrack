const AGENT_FLAG = 'JOB_SEARCH_AGENT_ENABLED';

function isTruthyFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function normalizeRole(role) {
  return String(role || 'USER').trim().toUpperCase();
}

function hasJobSearchAgentEnabled(user = {}) {
  if (typeof user.jobSearchAgentEnabled === 'boolean') {
    return user.jobSearchAgentEnabled;
  }
  if (Array.isArray(user.featureFlags)) {
    return user.featureFlags.includes(AGENT_FLAG);
  }
  if (user.featureFlags && typeof user.featureFlags === 'object') {
    return isTruthyFlag(user.featureFlags[AGENT_FLAG]);
  }
  return false;
}

function evaluateAgentAccess(user = {}) {
  const role = normalizeRole(user.role);
  const isAdmin = role === 'ADMIN' || user.isAdmin === true;
  const agentEnabled = hasJobSearchAgentEnabled(user);
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

module.exports = {
  AGENT_FLAG,
  hasJobSearchAgentEnabled,
  evaluateAgentAccess,
};
