const mockDisconnect = jest.fn();
const mockQueryRawUnsafe = jest.fn(async (sql) => {
  if (String(sql).includes('to_regclass')) {
    return [{ table_name: 'public.mock_table' }];
  }
  if (String(sql).includes('COUNT(*)')) {
    return [{ count: 42n }];
  }
  return [
    {
      oldest: new Date('2026-06-15T08:00:00.000Z'),
      newest: new Date('2026-06-15T10:00:00.000Z'),
    },
  ];
});

function getRouteHandler(path) {
  jest.resetModules();
  jest.doMock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => ({
      $queryRawUnsafe: mockQueryRawUnsafe,
      $disconnect: mockDisconnect,
    })),
  }));
  const router = require('../src/routes/persistence.routes');
  const layer = router.stack.find((entry) => entry.route?.path === path);
  return layer?.route?.stack?.[0]?.handle;
}

describe('persistence stats route', () => {
  beforeEach(() => {
    mockDisconnect.mockClear();
    mockDisconnect.mockResolvedValue(undefined);
    mockQueryRawUnsafe.mockClear();
  });

  afterEach(() => {
    jest.dontMock('@prisma/client');
  });

  it('ferme le PrismaClient créé pour éviter de saturer Postgres', async () => {
    const handler = getRouteHandler('/stats');
    const res = {
      json: jest.fn(),
      status: jest.fn(function status() {
        return this;
      }),
    };

    await handler({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
