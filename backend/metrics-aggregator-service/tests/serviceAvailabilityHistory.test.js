const mockQueryRawUnsafe = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $queryRawUnsafe: mockQueryRawUnsafe,
    serviceAvailabilityHistory: {
      findMany: mockFindMany,
    },
  })),
}));

function loadPersistenceService() {
  jest.resetModules();
  process.env.DATABASE_URL = 'postgresql://jobbingtrack:test@localhost:5432/jobbingtrack';
  return require('../src/services/persistence.service');
}

describe('service availability history', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockFindMany.mockReset();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('échantillonne toute la plage demandée au lieu de prendre seulement les derniers points', async () => {
    mockQueryRawUnsafe.mockResolvedValue([
      {
        id: 'service_availability_1',
        timestamp: new Date('2026-06-15T12:00:00.000Z'),
        serviceName: 'auth-service',
        isAvailable: true,
        responseTimeMs: 40,
        statusCode: 200,
        errorMessage: null,
        uptimePercent: 99,
        createdAt: new Date('2026-06-15T12:00:00.000Z'),
      },
      {
        id: 'service_availability_0',
        timestamp: new Date('2026-06-14T12:00:00.000Z'),
        serviceName: 'auth-service',
        isAvailable: true,
        responseTimeMs: 20,
        statusCode: 200,
        errorMessage: null,
        uptimePercent: 100,
        createdAt: new Date('2026-06-14T12:00:00.000Z'),
      },
    ]);

    const persistenceService = loadPersistenceService();
    const rows = await persistenceService.getServiceAvailabilityHistory(
      'auth-service',
      {
        startDate: '2026-06-14T00:00:00.000Z',
        endDate: '2026-06-16T00:00:00.000Z',
        limit: 2,
      },
    );

    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1);
    const sql = mockQueryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain('FLOOR((EXTRACT(EPOCH FROM ts)');
    expect(sql).toContain('GROUP BY bucket');
    expect(rows.map((row) => row.timestamp)).toEqual([
      '2026-06-14T12:00:00.000Z',
      '2026-06-15T12:00:00.000Z',
    ]);
    expect(rows.map((row) => row.responseTimeMs)).toEqual([20, 40]);
  });

  it('conserve le chemin Prisma simple sans plage bornée', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'latest',
        timestamp: new Date('2026-06-16T10:00:00.000Z'),
        serviceName: 'auth-service',
        isAvailable: true,
        responseTimeMs: 12,
        statusCode: 200,
        errorMessage: null,
        uptimePercent: 100,
        createdAt: new Date('2026-06-16T10:00:00.000Z'),
      },
    ]);

    const persistenceService = loadPersistenceService();
    const rows =
      await persistenceService.getServiceAvailabilityHistory('auth-service');

    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { timestamp: 'desc' },
        take: 400,
      }),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        timestamp: '2026-06-16T10:00:00.000Z',
        responseTimeMs: 12,
      }),
    ]);
  });

  it('agrège les statistiques sur tous les alias du même service', async () => {
    mockFindMany.mockResolvedValue([
      {
        timestamp: new Date('2026-06-16T09:00:00.000Z'),
        serviceName: 'auth-service',
        isAvailable: true,
        responseTimeMs: 20,
      },
      {
        timestamp: new Date('2026-06-16T09:05:00.000Z'),
        serviceName: 'jobbingtrack-auth-service',
        isAvailable: true,
        responseTimeMs: 40,
      },
      {
        timestamp: new Date('2026-06-16T09:10:00.000Z'),
        serviceName: 'jobbingtrack-auth-service',
        isAvailable: false,
        responseTimeMs: null,
      },
    ]);

    const persistenceService = loadPersistenceService();
    const stats = await persistenceService.getServiceAvailabilityStats(
      'auth-service',
      24,
    );

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceName: {
            in: ['auth-service', 'jobbingtrack-auth-service'],
          },
        }),
        orderBy: { timestamp: 'asc' },
      }),
    );
    expect(stats).toMatchObject({
      serviceName: 'auth-service',
      totalChecks: 3,
      availableChecks: 2,
      avgResponseTime: 30,
      maxResponseTime: 40,
      minResponseTime: 20,
    });
  });
});
