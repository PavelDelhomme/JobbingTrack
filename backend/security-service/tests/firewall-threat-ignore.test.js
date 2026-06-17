const mockPrisma = {
  networkThreat: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../src/network-monitor', () => ({}));
jest.mock('../src/firewall-engine', () => ({}));
jest.mock('../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
  logSecurityEvent: jest.fn(),
}));
jest.mock('../src/services/securityService', () => ({
  createSecurityLog: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/utils/geoipProvider', () => ({
  lookupGeoIp: jest.fn(),
  enrichIpBatch: jest.fn(),
}));

const firewallController = require('../src/controllers/firewallController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('ignoreThreat / unignoreThreat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marque une menace comme ignorée (faux positif)', async () => {
    const threat = {
      id: 'threat-1',
      threatType: 'BRUTE_FORCE',
      sourceIp: '203.0.113.52',
      metadata: { lab: true },
    };
    mockPrisma.networkThreat.findUnique.mockResolvedValue(threat);
    mockPrisma.networkThreat.update.mockResolvedValue({
      ...threat,
      metadata: {
        lab: true,
        ignored: true,
        ignoreReason: 'Test lab',
        ignoredAt: '2026-06-17T12:00:00.000Z',
        ignoredBy: 'admin-1',
      },
    });

    const req = {
      params: { id: 'threat-1' },
      body: { reason: 'Test lab' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      originalUrl: '/api/v1/security/firewall/threats/threat-1/ignore',
      method: 'POST',
    };
    const res = mockRes();

    await firewallController.ignoreThreat(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ ignored: true }),
      }),
    );
  });

  it('réintègre une menace ignorée', async () => {
    const threat = {
      id: 'threat-2',
      threatType: 'PORT_SCAN',
      sourceIp: '198.51.100.10',
      metadata: { ignored: true, ignoreReason: 'Faux positif' },
    };
    mockPrisma.networkThreat.findUnique.mockResolvedValue(threat);
    mockPrisma.networkThreat.update.mockResolvedValue({
      ...threat,
      metadata: {},
    });

    const req = { params: { id: 'threat-2' }, user: { id: 'admin-1' } };
    const res = mockRes();

    await firewallController.unignoreThreat(req, res);

    expect(mockPrisma.networkThreat.update).toHaveBeenCalledWith({
      where: { id: 'threat-2' },
      data: { metadata: {} },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
