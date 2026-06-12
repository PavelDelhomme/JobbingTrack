const mockPrisma = {
  securityLog: {
    findMany: jest.fn(),
    count: jest.fn()
  }
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  logSecurityEvent: jest.fn()
}));

jest.mock('../src/services/dataGenerator', () => ({}));
jest.mock('../src/services/securityAlertEmailNotifier', () => ({}));
jest.mock('../src/utils/geoipProvider', () => ({
  lookupGeoIp: jest.fn()
}));

describe('securityService.getSecurityLogs', () => {
  let securityService;

  beforeEach(() => {
    jest.resetModules();
    mockPrisma.securityLog.findMany.mockResolvedValue([]);
    mockPrisma.securityLog.count.mockResolvedValue(0);
    securityService = require('../src/services/securityService');
  });

  it('filtre les logs côté serveur et trie par date décroissante par défaut', async () => {
    await securityService.getSecurityLogs({
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      eventType: 'network_threat_detected',
      q: '198.51.100.42',
      limit: 50,
      offset: 100
    });

    expect(mockPrisma.securityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'network_threat_detected',
          OR: expect.arrayContaining([
            { message: { contains: '198.51.100.42', mode: 'insensitive' } },
            { sourceIP: { contains: '198.51.100.42', mode: 'insensitive' } },
            { endpoint: { contains: '198.51.100.42', mode: 'insensitive' } }
          ])
        }),
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 100
      })
    );
    expect(mockPrisma.securityLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'network_threat_detected'
        })
      })
    );
  });

  it('borne le tri aux valeurs supportées', async () => {
    await securityService.getSecurityLogs({ order: 'asc' });
    expect(mockPrisma.securityLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'asc' } })
    );

    await securityService.getSecurityLogs({ order: 'random' });
    expect(mockPrisma.securityLog.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'desc' } })
    );
  });

  it('prépare les suggestions de filtres depuis les logs récents', async () => {
    mockPrisma.securityLog.findMany.mockResolvedValueOnce([
      {
        level: 'warning',
        category: 'auth',
        eventType: 'login_failed',
        sourceIP: '198.51.100.42',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        message: 'Échec de connexion lab'
      },
      {
        level: 'critical',
        category: 'waf',
        eventType: 'waf_blocked',
        sourceIP: '203.0.113.77',
        endpoint: '/api/v1/admin',
        method: 'GET',
        message: 'Payload SQLi bloqué'
      },
      {
        level: 'warning',
        category: 'auth',
        eventType: 'login_failed',
        sourceIP: '198.51.100.42',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        message: 'Échec de connexion lab'
      }
    ]);

    const facets = await securityService.getSecurityLogFacets({
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      sampleLimit: 200
    });

    expect(mockPrisma.securityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
        select: expect.objectContaining({
          category: true,
          eventType: true,
          sourceIP: true,
          endpoint: true
        })
      })
    );
    expect(facets.sampleSize).toBe(3);
    expect(facets.categories[0]).toEqual({ value: 'auth', count: 2 });
    expect(facets.eventTypes[0]).toEqual({ value: 'login_failed', count: 2 });
    expect(facets.sourceIPs[0]).toEqual({ value: '198.51.100.42', count: 2 });
  });
});
