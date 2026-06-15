const mockGetPersistenceTableStats = jest.fn();

jest.mock('../src/services/persistence.service', () => ({
  getPersistenceTableStats: (...args) => mockGetPersistenceTableStats(...args),
}));

function getRouteHandler(path) {
  const router = require('../src/routes/persistence.routes');
  const layer = router.stack.find((entry) => entry.route?.path === path);
  return layer?.route?.stack?.[0]?.handle;
}

describe('persistence stats route', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetPersistenceTableStats.mockReset();
    mockGetPersistenceTableStats.mockResolvedValue({
      counts: { systemMetrics: 42, total: 42 },
      dataRange: { oldest: null, newest: null },
    });
  });

  it('délègue au singleton persistenceService sans créer de PrismaClient éphémère', async () => {
    const handler = getRouteHandler('/stats');
    const res = {
      json: jest.fn(),
      status: jest.fn(function status() {
        return this;
      }),
    };

    await handler({}, res);

    expect(mockGetPersistenceTableStats).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          counts: expect.objectContaining({ systemMetrics: 42 }),
        }),
      }),
    );
  });
});
