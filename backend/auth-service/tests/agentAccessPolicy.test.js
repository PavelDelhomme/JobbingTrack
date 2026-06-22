const {
  evaluateAgentAccess,
  hasRequiredConsents,
  CONSENT_TYPES,
} = require('../src/lib/agentAccessPolicy');

describe('agentAccessPolicy', () => {
  it('bloque sans email vérifié', () => {
    const result = evaluateAgentAccess({
      emailVerified: false,
      jobSearchAgentEnabled: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('email_not_verified');
  });

  it('bloque sans JOB_SEARCH_AGENT_ENABLED', () => {
    const result = evaluateAgentAccess({
      emailVerified: true,
      jobSearchAgentEnabled: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('job_search_agent_disabled');
  });

  it('autorise un utilisateur activé', () => {
    const result = evaluateAgentAccess({
      emailVerified: true,
      jobSearchAgentEnabled: true,
      role: 'USER',
    });
    expect(result.allowed).toBe(true);
    expect(result.canConnectMailbox).toBe(true);
  });

  it('exige MAILBOX_ACCESS avant connexion boîte', () => {
    expect(
      hasRequiredConsents([
        { consentType: 'CONTENT_CLASSIFICATION', granted: true },
      ]),
    ).toBe(false);
    expect(
      hasRequiredConsents([{ consentType: 'MAILBOX_ACCESS', granted: true }]),
    ).toBe(true);
  });

  it('déclare les 6 types de consentement', () => {
    expect(CONSENT_TYPES).toHaveLength(6);
  });
});
