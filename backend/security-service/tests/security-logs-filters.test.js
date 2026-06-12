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
});
