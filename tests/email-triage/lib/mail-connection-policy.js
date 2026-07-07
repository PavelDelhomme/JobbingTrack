const { isEmailTriageIntegrationEnabled } = require('../helpers/require-env');

function isPresent(value) {
  return Boolean(value && String(value).trim() !== '');
}

function isPlaceholderCredential(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('example.invalid') ||
    normalized.includes('jobbingtrack.test') ||
    normalized.includes('redacted@') ||
    normalized === 'changeme'
  );
}

function evaluateGmailConnection(env = process.env) {
  if (!isEmailTriageIntegrationEnabled()) {
    return {
      ready: false,
      skip: true,
      reason: 'integration_disabled_set_TEST_EMAIL_TRIAGE_ENABLED_true',
      missing: ['TEST_EMAIL_TRIAGE_ENABLED'],
    };
  }

  const account = env.TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT;
  const refreshToken = env.TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN;
  const missing = [];

  if (!isPresent(account) || isPlaceholderCredential(account)) {
    missing.push('TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT');
  }
  if (!isPresent(refreshToken) || isPlaceholderCredential(refreshToken)) {
    missing.push('TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN');
  }

  if (missing.length > 0) {
    return {
      ready: false,
      skip: true,
      reason: 'gmail_credentials_missing_or_placeholder',
      missing,
      mode: 'gmail_oauth_readonly',
    };
  }

  return {
    ready: true,
    skip: false,
    reason: 'ok',
    missing: [],
    mode: 'gmail_oauth_readonly',
    account,
  };
}

function evaluateImapConnection(env = process.env) {
  if (!isEmailTriageIntegrationEnabled()) {
    return {
      ready: false,
      skip: true,
      reason: 'integration_disabled_set_TEST_EMAIL_TRIAGE_ENABLED_true',
      missing: ['TEST_EMAIL_TRIAGE_ENABLED'],
    };
  }

  const email = env.TEST_EMAIL_TRIAGE_IMAP_EMAIL || env.EMAIL_TRIAGE_READ_ACCOUNT;
  const host =
    env.TEST_EMAIL_TRIAGE_IMAP_HOST ||
    env.TEST_REAL_EMAIL_IMAP_HOST ||
    'imap.mail.ovh.net';
  const port = env.TEST_EMAIL_TRIAGE_IMAP_PORT || env.TEST_REAL_EMAIL_IMAP_PORT || '993';
  const password =
    env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD ||
    env.EMAIL_TRIAGE_READ_PASSWORD ||
    env.TEST_REAL_EMAIL_IMAP_PASSWORD;
  const missing = [];

  if (!isPresent(email) || isPlaceholderCredential(email)) {
    missing.push('TEST_EMAIL_TRIAGE_IMAP_EMAIL');
  }
  if (!isPresent(host) || host.includes('example.com')) {
    missing.push('TEST_EMAIL_TRIAGE_IMAP_HOST');
  }
  if (!isPresent(port)) {
    missing.push('TEST_EMAIL_TRIAGE_IMAP_PORT');
  }
  if (!isPresent(password) || isPlaceholderCredential(password)) {
    missing.push('TEST_EMAIL_TRIAGE_IMAP_PASSWORD');
  }

  if (missing.length > 0) {
    return {
      ready: false,
      skip: true,
      reason: 'imap_credentials_missing_or_placeholder',
      missing,
      mode: 'imap_readonly',
    };
  }

  return {
    ready: true,
    skip: false,
    reason: 'ok',
    missing: [],
    mode: 'imap_readonly',
    host,
    port: Number(port),
    email,
  };
}

function evaluateMailConnections(env = process.env) {
  const gmail = evaluateGmailConnection(env);
  const imap = evaluateImapConnection(env);
  const anyReady = gmail.ready || imap.ready;

  return {
    anyReady,
    gmail,
    imap,
    summary: anyReady
      ? 'at_least_one_mailbox_ready'
      : 'all_mailbox_connections_skipped',
  };
}

module.exports = {
  evaluateGmailConnection,
  evaluateImapConnection,
  evaluateMailConnections,
  isPlaceholderCredential,
};
