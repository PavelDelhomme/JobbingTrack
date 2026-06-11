const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const {
  evaluateGmailConnection,
  evaluateImapConnection,
  evaluateMailConnections,
} = require('./lib/mail-connection-policy');

describe('email-triage mail-connection-policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('skip explicitement si TEST_EMAIL_TRIAGE_ENABLED=false', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'false';

    expect(evaluateGmailConnection(process.env)).toMatchObject({
      ready: false,
      skip: true,
      reason: 'integration_disabled_set_TEST_EMAIL_TRIAGE_ENABLED_true',
    });
    expect(evaluateImapConnection(process.env)).toMatchObject({
      ready: false,
      skip: true,
    });
  });

  it('skip Gmail si compte ou refresh token manquant/placeholder', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'true';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT = 'redacted@example.invalid';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN = '';

    expect(evaluateGmailConnection(process.env)).toMatchObject({
      ready: false,
      skip: true,
      reason: 'gmail_credentials_missing_or_placeholder',
      missing: expect.arrayContaining([
        'TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT',
        'TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN',
      ]),
    });
  });

  it('marque Gmail prêt si credentials réels présents', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'true';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT = 'mailbox@gmail.com';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN = 'ya29.real-token-value';

    expect(evaluateGmailConnection(process.env)).toMatchObject({
      ready: true,
      skip: false,
      reason: 'ok',
      mode: 'gmail_oauth_readonly',
      account: 'mailbox@gmail.com',
    });
  });

  it('skip IMAP si host/email/password placeholder', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'true';
    process.env.TEST_EMAIL_TRIAGE_IMAP_EMAIL = 'redacted@example.invalid';
    process.env.TEST_EMAIL_TRIAGE_IMAP_HOST = 'imap.example.com';
    process.env.TEST_EMAIL_TRIAGE_IMAP_PORT = '993';
    process.env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD = '';

    expect(evaluateImapConnection(process.env)).toMatchObject({
      ready: false,
      skip: true,
      reason: 'imap_credentials_missing_or_placeholder',
    });
  });

  it('marque IMAP prêt si credentials réels présents', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'true';
    process.env.TEST_EMAIL_TRIAGE_IMAP_EMAIL = 'candidatures@delhomme.ovh';
    process.env.TEST_EMAIL_TRIAGE_IMAP_HOST = 'imap.mail.ovh.net';
    process.env.TEST_EMAIL_TRIAGE_IMAP_PORT = '993';
    process.env.TEST_EMAIL_TRIAGE_IMAP_PASSWORD = 'real-imap-password';

    expect(evaluateImapConnection(process.env)).toMatchObject({
      ready: true,
      skip: false,
      mode: 'imap_readonly',
      host: 'imap.mail.ovh.net',
      port: 993,
    });
  });

  it('résume les connexions disponibles', () => {
    process.env.TEST_EMAIL_TRIAGE_ENABLED = 'true';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_ACCOUNT = 'mailbox@gmail.com';
    process.env.TEST_EMAIL_TRIAGE_GMAIL_REFRESH_TOKEN = 'ya29.real-token-value';

    expect(evaluateMailConnections(process.env)).toMatchObject({
      anyReady: true,
      summary: 'at_least_one_mailbox_ready',
    });
  });
});
