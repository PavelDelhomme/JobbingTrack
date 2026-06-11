const { describe, it, expect } = require('@jest/globals');
const {
  AGENT_FLAG,
  hasJobSearchAgentEnabled,
  evaluateAgentAccess,
} = require('./lib/agent-access-policy');

describe('email-triage agent-access-policy', () => {
  it('expose le feature flag attendu', () => {
    expect(AGENT_FLAG).toBe('JOB_SEARCH_AGENT_ENABLED');
  });

  it('détecte le flag sur le profil utilisateur', () => {
    expect(hasJobSearchAgentEnabled({ jobSearchAgentEnabled: true })).toBe(true);
    expect(hasJobSearchAgentEnabled({ featureFlags: [AGENT_FLAG] })).toBe(true);
    expect(hasJobSearchAgentEnabled({ featureFlags: { [AGENT_FLAG]: 'true' } })).toBe(true);
    expect(hasJobSearchAgentEnabled({})).toBe(false);
  });

  it('bloque un compte sans JOB_SEARCH_AGENT_ENABLED', () => {
    expect(
      evaluateAgentAccess({
        role: 'USER',
        emailVerified: true,
        jobSearchAgentEnabled: false,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'job_search_agent_disabled',
      canConnectMailbox: false,
    });
  });

  it('autorise un compte personnel explicitement activé', () => {
    expect(
      evaluateAgentAccess({
        role: 'USER',
        emailVerified: true,
        jobSearchAgentEnabled: true,
      }),
    ).toMatchObject({
      allowed: true,
      reason: 'ok',
      canConnectMailbox: true,
      canReadMailbox: true,
    });
  });

  it('bloque un admin qui tente de lire le contenu email personnel sans consentement', () => {
    expect(
      evaluateAgentAccess({
        role: 'ADMIN',
        emailVerified: true,
        jobSearchAgentEnabled: true,
        requestingPersonalEmailContent: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'admin_cannot_read_personal_email_without_user_consent',
      canReadMailbox: false,
    });
  });

  it('bloque un compte non vérifié même si le flag est actif', () => {
    expect(
      evaluateAgentAccess({
        role: 'USER',
        emailVerified: false,
        jobSearchAgentEnabled: true,
      }),
    ).toMatchObject({
      allowed: false,
      reason: 'email_not_verified',
    });
  });
});
