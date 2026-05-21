const mockPrisma = {
  firewallRule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  networkThreat: {
    updateMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../src/network-monitor', () => ({}));

jest.mock('../src/firewall-engine', () => ({
  applyFirewallRule: jest.fn(),
  unblockIp: jest.fn()
}));

jest.mock('../src/services/securityService', () => ({
  createSecurityLog: jest.fn()
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

jest.mock('../src/utils/geoipProvider', () => ({
  lookupGeoIp: jest.fn()
}));

const firewallController = require('../src/controllers/firewallController');
const firewallEngine = require('../src/firewall-engine');
const securityService = require('../src/services/securityService');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockRequest(body) {
  return {
    body,
    ip: '172.19.0.1',
    connection: {},
    originalUrl: '/api/v1/security/firewall/unblock-ip',
    method: 'POST',
    user: { id: 'admin-1' },
    get: jest.fn(() => 'jest')
  };
}

describe('Firewall - déblocage IP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firewallEngine.unblockIp.mockResolvedValue({
      success: true,
      message: 'ok',
      iptablesRemoved: false
    });
    securityService.createSecurityLog.mockResolvedValue({});
  });

  test('désactive les règles et menaces bloquées associées à une IP valide', async () => {
    mockPrisma.firewallRule.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.networkThreat.updateMany.mockResolvedValue({ count: 2 });

    const res = mockResponse();
    await firewallController.unblockIp(mockRequest({ ip: '172.19.0.16' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(firewallEngine.unblockIp).toHaveBeenCalledWith('172.19.0.16');
    expect(mockPrisma.firewallRule.updateMany).toHaveBeenCalledWith({
      where: {
        sourceIp: '172.19.0.16',
        action: { in: ['DENY', 'REJECT'] },
        enabled: true
      },
      data: { enabled: false }
    });
    expect(mockPrisma.networkThreat.updateMany).toHaveBeenCalledWith({
      where: {
        sourceIp: '172.19.0.16',
        blocked: true
      },
      data: { blocked: false }
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          disabledRules: 1,
          unblockedThreats: 2
        })
      })
    );
  });

  test('nettoie une ancienne règle avec IP invalide sans appeler iptables', async () => {
    mockPrisma.firewallRule.updateMany.mockResolvedValue({ count: 1 });

    const res = mockResponse();
    await firewallController.unblockIp(mockRequest({ ip: '999.999.999.999' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(firewallEngine.unblockIp).not.toHaveBeenCalled();
    expect(mockPrisma.networkThreat.updateMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          invalidLegacyIp: true,
          disabledRules: 1
        })
      })
    );
  });

  test('refuse une IP invalide sans règle historique à nettoyer', async () => {
    mockPrisma.firewallRule.updateMany.mockResolvedValue({ count: 0 });

    const res = mockResponse();
    await firewallController.unblockIp(mockRequest({ ip: '999.999.999.999' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(firewallEngine.unblockIp).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Format IP invalide'
    });
  });
});

describe('Firewall - garde-fous de portée des règles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firewallEngine.applyFirewallRule.mockResolvedValue({
      success: true,
      iptablesApplied: false
    });
    securityService.createSecurityLog.mockResolvedValue({});
  });

  test('refuse la création d’une règle sans IP source', async () => {
    const res = mockResponse();
    await firewallController.createFirewallRule(
      mockRequest({
        name: 'Blocage trop large',
        protocol: 'TCP',
        action: 'DENY',
        destPort: 22
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.firewallRule.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'IP source requise : le backoffice refuse les règles globales sans IP source.'
    });
  });

  test('accepte une règle ciblée par IP source, avec port optionnel', async () => {
    const createdRule = {
      id: 'rule-1',
      name: 'Blocage IP test',
      sourceIp: '203.0.113.77',
      destPort: null,
      protocol: 'TCP',
      action: 'DENY',
      priority: 100,
      enabled: true
    };
    mockPrisma.firewallRule.findMany.mockResolvedValue([]);
    mockPrisma.firewallRule.create.mockResolvedValue(createdRule);

    const res = mockResponse();
    await firewallController.createFirewallRule(
      mockRequest({
        name: 'Blocage IP test',
        protocol: 'TCP',
        action: 'DENY',
        sourceIp: '203.0.113.77'
      }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockPrisma.firewallRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceIp: '203.0.113.77',
        destPort: null,
        protocol: 'TCP',
        action: 'DENY'
      })
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: createdRule
    });
  });

  test('refuse la modification d’une règle qui retirerait l’IP source', async () => {
    mockPrisma.firewallRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      name: 'Blocage IP test',
      sourceIp: '203.0.113.77',
      destPort: null,
      protocol: 'TCP',
      action: 'DENY',
      priority: 100,
      enabled: true
    });

    const res = mockResponse();
    await firewallController.updateFirewallRule(
      {
        ...mockRequest({
          name: 'Blocage trop large',
          sourceIp: '',
          protocol: 'TCP',
          action: 'DENY',
          priority: 100
        }),
        params: { id: 'rule-1' }
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPrisma.firewallRule.update).not.toHaveBeenCalled();
  });
});
