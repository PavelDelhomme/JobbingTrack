const { describe, it, expect } = require('@jest/globals');
const { evaluateMailConnections } = require('./lib/mail-connection-policy');

const readiness = evaluateMailConnections(process.env);
const integrationTest = readiness.anyReady ? it : it.skip;

describe('email-triage mail-connection integration', () => {
  integrationTest(
    'prépare une connexion boîte mail quand TEST_EMAIL_TRIAGE_ENABLED et secrets sont présents',
    () => {
      expect(readiness.anyReady).toBe(true);
      expect(readiness.summary).toBe('at_least_one_mailbox_ready');

      if (readiness.gmail.ready) {
        expect(readiness.gmail.mode).toBe('gmail_oauth_readonly');
        expect(readiness.gmail.account).toBeTruthy();
      }

      if (readiness.imap.ready) {
        expect(readiness.imap.mode).toBe('imap_readonly');
        expect(readiness.imap.host).toBeTruthy();
      }
    },
  );

  it('documente le skip explicite quand aucune boîte n’est configurée', () => {
    if (!readiness.anyReady) {
      expect(readiness.summary).toBe('all_mailbox_connections_skipped');
      expect(readiness.gmail.skip || readiness.imap.skip).toBe(true);
    } else {
      expect(readiness.anyReady).toBe(true);
    }
  });
});
