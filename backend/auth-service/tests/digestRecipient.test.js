const { resolveDigestRecipient, extractEmailAddress } = require('../src/lib/digestRecipient');

describe('digestRecipient', () => {
  it('utilise user.email par défaut', () => {
    const r = resolveDigestRecipient(
      { email: 'user@company.com' },
      {},
    );
    expect(r.to).toBe('user@company.com');
    expect(r.source).toBe('user_email');
  });

  it('redirige le porteur vers Gmail pro si configuré', () => {
    const r = resolveDigestRecipient(
      { email: 'paul.delhomme@proton.me' },
      {
        EMAIL_TRIAGE_DIGEST_OVERRIDE_EMAILS: 'paul.delhomme@proton.me',
        EMAIL_TRIAGE_DIGEST_RECIPIENT: 'pauldelhomme.pro@gmail.com',
      },
    );
    expect(r.to).toBe('pauldelhomme.pro@gmail.com');
    expect(r.accountEmail).toBe('paul.delhomme@proton.me');
    expect(r.source).toBe('env_override');
  });
});
