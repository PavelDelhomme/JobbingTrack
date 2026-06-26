const {
  discoverImapSettings,
  hintFromDomain,
  extractDomain,
} = require('../src/services/imapDiscoveryService');

describe('imapDiscoveryService', () => {
  it('extrait le domaine email', () => {
    expect(extractDomain('candidatures@delhomme.ovh')).toBe('delhomme.ovh');
  });

  it('propose OVH pour un domaine .ovh', () => {
    const hint = hintFromDomain('delhomme.ovh');
    expect(hint.imapHost).toBe('imap.mail.ovh.net');
    expect(hint.smtpHost).toBe('smtp.mail.ovh.net');
    expect(hint.smtpPort).toBe(587);
    expect(hint.provider).toBe('OVH');
  });

  it('propose Gmail pour gmail.com', () => {
    const hint = hintFromDomain('gmail.com');
    expect(hint.imapHost).toBe('imap.gmail.com');
  });

  it('découvre candidatures@delhomme.ovh', async () => {
    const result = await discoverImapSettings('candidatures@delhomme.ovh');
    expect(result.found).toBe(true);
    expect(result.suggested.imapHost).toBe('imap.mail.ovh.net');
  });
});
