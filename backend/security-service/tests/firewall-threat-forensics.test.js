const mockPrisma = {
  networkThreat: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  securityLog: {
    findMany: jest.fn()
  },
  intrusionAttempt: {
    findMany: jest.fn()
  },
  dDoSAttack: {
    findMany: jest.fn()
  },
  networkConnection: {
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../src/network-monitor', () => ({}));

jest.mock('../src/firewall-engine', () => ({
  blockIp: jest.fn()
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
  lookupGeoIp: jest.fn(async (ip) => {
    if (ip === '8.8.8.8') {
      return {
        private: false,
        country: 'United States',
        city: 'Mountain View',
        region: 'California',
        timezone: 'America/Los_Angeles',
        ll: [37.386, -122.0838],
        asn: 'AS15169',
        organization: 'Google LLC',
        proxy: false,
        vpn: false,
        tor: false
      };
    }
    if (
      ip === '127.0.0.1' ||
      ip.startsWith('10.') ||
      ip.startsWith('172.') ||
      ip.startsWith('192.168.')
    ) {
      return {
        private: true,
        country: null,
        city: null,
        region: null,
        timezone: null,
        ll: null,
        asn: null,
        organization: null,
        proxy: null,
        vpn: null,
        tor: null,
        note: 'Réseau privé'
      };
    }
    return null;
  })
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

function getJsonPayload(res) {
  return res.json.mock.calls[0][0];
}

describe('Firewall threats - détails forensics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enrichit une menace DDoS externe avec réseau, logs, comptes, services et attaques liées', async () => {
    const detectedAt = new Date('2026-05-11T10:00:00.000Z');
    const threat = {
      id: 'threat-ddos-1',
      threatType: 'DDOS',
      sourceIp: '8.8.8.8',
      destIp: null,
      destPort: 443,
      severity: 'CRITICAL',
      detectedAt,
      blocked: false,
      metadata: {
        message: 'Trafic HTTP anormal',
        count: 260,
        ports: [443, 3001],
        protocols: ['TCP', 'HTTP'],
        states: ['ESTABLISHED', 'SYN_RECV'],
        totalConnections: 260,
        containerInfo: {
          containerName: 'jobbingtrack-api-gateway',
          containerId: 'gateway-1'
        },
        connectionDetails: [
          {
            localIp: '172.20.0.10',
            localPort: 443,
            remotePort: 53122,
            protocol: 'TCP',
            state: 'ESTABLISHED',
            containerName: 'jobbingtrack-api-gateway'
          }
        ]
      }
    };
    const logs = [
      {
        id: 'log-1',
        timestamp: new Date('2026-05-11T10:00:02.000Z'),
        level: 'critical',
        category: 'ddos',
        eventType: 'high_traffic',
        message: 'Trafic anormalement élevé détecté depuis 8.8.8.8',
        sourceIP: '8.8.8.8',
        userId: 'user-impacted-1',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        statusCode: 429,
        responseTime: 18,
        riskScore: 95,
        isBlocked: true,
        metadata: { serviceName: 'api-gateway' }
      },
      {
        id: 'log-2',
        timestamp: new Date('2026-05-11T09:59:58.000Z'),
        level: 'error',
        category: 'network',
        eventType: 'network_threat_detected',
        message: 'DDOS détecté depuis 8.8.8.8',
        sourceIP: '8.8.8.8',
        userId: null,
        endpoint: '/api/v1/jobs',
        method: 'GET',
        statusCode: 503,
        responseTime: 240,
        riskScore: 90,
        isBlocked: false,
        metadata: { service: 'job-service' }
      }
    ];
    const ddosAttacks = [
      {
        id: 'ddos-1',
        sourceIPs: ['8.8.8.8'],
        attackType: 'application',
        targetEndpoint: '/api/v1/auth/login',
        requestsPerSecond: 220
      }
    ];

    mockPrisma.networkThreat.findUnique.mockResolvedValue(threat);
    mockPrisma.securityLog.findMany.mockResolvedValue(logs);
    mockPrisma.intrusionAttempt.findMany.mockResolvedValue([]);
    mockPrisma.dDoSAttack.findMany.mockResolvedValue(ddosAttacks);
    mockPrisma.networkConnection.findMany.mockResolvedValue([]);

    const res = mockResponse();
    await firewallController.getThreatDetails({ params: { id: threat.id } }, res);

    const body = getJsonPayload(res);
    expect(body.success).toBe(true);
    expect(body.data.destIp).toBe('172.20.0.10');
    expect(body.data.investigation.attacker).toEqual(
      expect.objectContaining({
        ip: '8.8.8.8',
        isPrivateIp: false
      })
    );
    expect(body.data.investigation.target).toEqual(
      expect.objectContaining({
        ip: '172.20.0.10',
        port: 443,
        ports: [443, 3001],
        protocols: ['TCP', 'HTTP']
      })
    );
    expect(body.data.investigation.target.impactedServices).toEqual(
      expect.arrayContaining(['api-gateway', 'job-service', 'jobbingtrack-api-gateway'])
    );
    expect(body.data.investigation.application.logs).toEqual(
      expect.objectContaining({
        total: 2,
        blockedEvents: 1,
        maxRiskScore: 95,
        endpoints: ['/api/v1/auth/login', '/api/v1/jobs'],
        methods: ['POST', 'GET'],
        impactedUsers: ['user-impacted-1']
      })
    );
    expect(body.data.investigation.related.ddosAttacks).toEqual(ddosAttacks);
    expect(body.data.investigation.application.recentEvents[0]).toEqual(
      expect.objectContaining({
        eventType: 'high_traffic',
        endpoint: '/api/v1/auth/login',
        isBlocked: true
      })
    );
  });

  test.each([
    ['SQL_INJECTION', '198.51.100.23', 'payload SQL détecté'],
    ['WAF_BLOCK', '203.0.113.45', 'règle WAF déclenchée'],
    ['BRUTE_FORCE', '10.0.0.23', 'tentatives login répétées']
  ])('renvoie une investigation exploitable pour %s même avec télémétrie partielle', async (threatType, sourceIp, message) => {
    mockPrisma.networkThreat.findUnique.mockResolvedValue({
      id: `threat-${threatType}`,
      threatType,
      sourceIp,
      destIp: '172.20.0.5',
      destPort: 3001,
      severity: 'HIGH',
      detectedAt: new Date('2026-05-11T10:10:00.000Z'),
      blocked: false,
      metadata: { message, count: 12 }
    });
    mockPrisma.securityLog.findMany.mockResolvedValue([]);
    mockPrisma.intrusionAttempt.findMany.mockResolvedValue([
      {
        id: 'intrusion-1',
        sourceIP: sourceIp,
        attackType: threatType,
        targetEndpoint: '/api/v1/admin',
        method: 'POST',
        riskScore: 82
      }
    ]);
    mockPrisma.dDoSAttack.findMany.mockResolvedValue([]);
    mockPrisma.networkConnection.findMany.mockResolvedValue([]);

    const res = mockResponse();
    await firewallController.getThreatDetails({ params: { id: `threat-${threatType}` } }, res);

    const investigation = getJsonPayload(res).data.investigation;
    expect(investigation.attacker.ip).toBe(sourceIp);
    expect(investigation.target).toEqual(
      expect.objectContaining({
        ip: '172.20.0.5',
        port: 3001
      })
    );
    expect(investigation.related.intrusionAttempts).toHaveLength(1);
    const isPrivateSource =
      sourceIp.startsWith('10.') ||
      sourceIp.startsWith('172.') ||
      sourceIp.startsWith('192.168.') ||
      sourceIp === '127.0.0.1';
    expect(investigation.missingTelemetry).toEqual(
      expect.arrayContaining([
        isPrivateSource
          ? 'IP privée (Docker/LAN) — géolocalisation publique et réputation ASN/VPN non applicables'
          : 'Détection VPN/proxy/ASN non confirmée (provider indisponible ou métadonnées absentes)',
        'Aucun détail de connexion réseau brut conservé',
        'Aucun log sécurité corrélé à cette IP ou menace'
      ])
    );
  });

  test('récupère destination, ports, services et logs depuis NetworkConnection et metadata.sourceIp quand la menace est pauvre', async () => {
    const threat = {
      id: 'cmotuhb1v049sk7em4rwv6vlk',
      threatType: 'DDOS',
      sourceIp: '10.0.0.102',
      destIp: null,
      destPort: null,
      severity: 'CRITICAL',
      detectedAt: new Date('2026-05-11T10:20:00.000Z'),
      blocked: false,
      metadata: {
        test: true,
        packetsPerSec: 25000
      }
    };
    const logs = [
      {
        id: 'log-metadata-source',
        timestamp: new Date('2026-05-11T10:20:03.000Z'),
        level: 'critical',
        category: 'network',
        eventType: 'network_threat_detected',
        message: 'Menace test DDoS',
        sourceIP: '127.0.0.1',
        userId: 'candidate-42',
        endpoint: '/api/v1/jobs/search',
        method: 'GET',
        statusCode: 429,
        responseTime: 31,
        riskScore: 92,
        isBlocked: false,
        metadata: {
          sourceIp: '10.0.0.102',
          threatId: 'cmotuhb1v049sk7em4rwv6vlk',
          serviceName: 'job-service'
        }
      }
    ];
    const networkConnections = [
      {
        sourceIp: '10.0.0.102',
        sourcePort: 55122,
        destIp: '172.20.0.14',
        destPort: 3001,
        protocol: 'TCP',
        state: 'ESTABLISHED',
        containerName: 'jobbingtrack-auth-service',
        containerId: 'auth-1'
      },
      {
        sourceIp: '10.0.0.102',
        sourcePort: 55123,
        destIp: '172.20.0.15',
        destPort: 3004,
        protocol: 'TCP',
        state: 'SYN_RECV',
        containerName: 'jobbingtrack-contact-service',
        containerId: 'contact-1'
      }
    ];

    mockPrisma.networkThreat.findUnique.mockResolvedValue(threat);
    mockPrisma.securityLog.findMany.mockResolvedValue(logs);
    mockPrisma.intrusionAttempt.findMany.mockResolvedValue([]);
    mockPrisma.dDoSAttack.findMany.mockResolvedValue([]);
    mockPrisma.networkConnection.findMany.mockResolvedValue(networkConnections);

    const res = mockResponse();
    await firewallController.getThreatDetails({ params: { id: threat.id } }, res);

    const body = getJsonPayload(res);
    expect(body.data.destIp).toBe('172.20.0.14');
    expect(body.data.destPort).toBeNull();
    expect(body.data.investigation.attacker).toEqual(
      expect.objectContaining({
        ip: '10.0.0.102',
        isPrivateIp: true
      })
    );
    expect(body.data.investigation.target).toEqual(
      expect.objectContaining({
        ip: '172.20.0.14',
        port: null,
        ports: [3001, 3004],
        protocols: ['TCP']
      })
    );
    expect(body.data.investigation.target.impactedServices).toEqual(
      expect.arrayContaining(['job-service', 'jobbingtrack-auth-service', 'jobbingtrack-contact-service'])
    );
    expect(body.data.investigation.network).toEqual(
      expect.objectContaining({
        totalConnections: 2,
        states: ['ESTABLISHED', 'SYN_RECV']
      })
    );
    expect(body.data.investigation.network.connectionDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          localIp: '172.20.0.14',
          localPort: 3001,
          remotePort: 55122,
          state: 'ESTABLISHED',
          containerName: 'jobbingtrack-auth-service'
        })
      ])
    );
    expect(body.data.investigation.application.logs).toEqual(
      expect.objectContaining({
        total: 1,
        maxRiskScore: 92,
        endpoints: ['/api/v1/jobs/search'],
        impactedUsers: ['candidate-42']
      })
    );
  });

  test('bloque une menace critique et journalise le blocage firewall', async () => {
    const threat = {
      id: 'threat-critical-block',
      threatType: 'DDOS',
      sourceIp: '8.8.4.4',
      destPort: 443,
      severity: 'CRITICAL'
    };
    mockPrisma.networkThreat.findUnique.mockResolvedValue(threat);
    mockPrisma.networkThreat.update.mockResolvedValue({ ...threat, blocked: true });
    firewallEngine.blockIp.mockResolvedValue({ success: true, message: 'blocked' });
    securityService.createSecurityLog.mockResolvedValue({ id: 'log-block' });

    const req = {
      params: { id: threat.id },
      ip: '198.51.100.10',
      originalUrl: `/api/v1/security/firewall/threats/${threat.id}/block`,
      method: 'POST',
      user: { id: 'admin-1' },
      get: jest.fn(() => 'external-browser')
    };
    const res = mockResponse();

    await firewallController.blockThreat(req, res);

    expect(firewallEngine.blockIp).toHaveBeenCalledWith('8.8.4.4', 'Threat: DDOS');
    expect(mockPrisma.networkThreat.update).toHaveBeenCalledWith({
      where: { id: threat.id },
      data: { blocked: true }
    });
    expect(securityService.createSecurityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'critical',
        category: 'firewall',
        eventType: 'threat_blocked',
        sourceIP: '198.51.100.10',
        userId: 'admin-1',
        riskScore: 95,
        isBlocked: true,
        blockReason: 'Threat: DDOS',
        metadata: expect.objectContaining({
          threatId: threat.id,
          blockedIp: '8.8.4.4',
          severity: 'CRITICAL',
          iptablesApplied: true
        })
      })
    );
    expect(getJsonPayload(res)).toEqual({ success: true, message: 'blocked' });
  });
});
