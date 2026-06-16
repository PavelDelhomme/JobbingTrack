jest.mock('axios', () => ({
  get: jest.fn()
}));

const axios = require('axios');
const {
  isDocumentationIp,
  lookupGeoIp,
  normalizeIp
} = require('../src/utils/geoipProvider');

describe('geoipProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normalise les IPv4 mappées IPv6 et headers proxy simples', () => {
    expect(normalizeIp('::ffff:198.51.100.42')).toBe('198.51.100.42');
    expect(normalizeIp('203.0.113.77, 10.0.0.2')).toBe('203.0.113.77');
  });

  test('reconnaît les plages RFC5737 comme fixtures lab', () => {
    expect(isDocumentationIp('192.0.2.10')).toBe(true);
    expect(isDocumentationIp('198.51.100.42')).toBe(true);
    expect(isDocumentationIp('203.0.113.77')).toBe(true);
    expect(isDocumentationIp('8.8.8.8')).toBe(false);
  });

  test('retourne un profil lab public sans appel externe', async () => {
    const result = await lookupGeoIp('198.51.100.42');

    expect(result).toEqual(
      expect.objectContaining({
        private: false,
        asn: 'AS64514',
        proxy: false,
        vpn: false,
        tor: false,
        confidence: 'high',
        sources: ['rfc5737-lab-fixture']
      })
    );
    expect(result.enrichedAt).toBeTruthy();
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('retourne des profils lab proxy/datacenter et Tor', async () => {
    await expect(lookupGeoIp('203.0.113.77')).resolves.toEqual(
      expect.objectContaining({
        asn: 'AS64513',
        proxy: true,
        vpn: true,
        tor: false
      })
    );
    await expect(lookupGeoIp('192.0.2.55')).resolves.toEqual(
      expect.objectContaining({
        asn: 'AS64512',
        proxy: true,
        vpn: false,
        tor: true
      })
    );
  });
});
