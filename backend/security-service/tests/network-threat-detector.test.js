const mockPrisma = {
  networkThreat: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  networkConnection: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn()
  },
  securityAlert: {
    create: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../src/network-monitor', () => ({
  collectNetworkMetrics: jest.fn(),
  detectAnomalies: jest.fn(),
  isPrivateOrLocalIp: jest.fn((ip) => /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(String(ip || ''))),
  shouldSkipInternalNetworkAnomalies: jest.fn(() => false)
}));

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
  }
}));

const networkMonitor = require('../src/network-monitor');
const firewallEngine = require('../src/firewall-engine');
const securityService = require('../src/services/securityService');
const detector = require('../src/services/networkThreatDetector');

describe('NetworkThreatDetector - détection et blocage réel simulé', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.networkThreat.findFirst.mockResolvedValue(null);
    mockPrisma.networkConnection.findMany.mockResolvedValue([]);
    mockPrisma.networkConnection.create.mockResolvedValue({});
    mockPrisma.securityAlert.create.mockResolvedValue({ id: 'alert-1' });
    securityService.createSecurityLog.mockResolvedValue({ id: 'security-log-1' });
    networkMonitor.shouldSkipInternalNetworkAnomalies.mockReturnValue(false);
  });

  test('bloque automatiquement une attaque DDoS critique et conserve les détails réseau utiles', async () => {
    const connections = [
      {
        remoteIp: '203.0.113.200',
        remotePort: 53122,
        localIp: '172.20.0.10',
        localPort: 443,
        protocol: 'TCP',
        state: 0x01,
        containerName: 'jobbingtrack-api-gateway',
        containerId: 'gateway-1'
      },
      {
        remoteIp: '203.0.113.200',
        remotePort: 53123,
        localIp: '172.20.0.11',
        localPort: 3001,
        protocol: 'TCP',
        state: 0x01,
        containerName: 'jobbingtrack-auth-service',
        containerId: 'auth-1'
      }
    ];
    const anomaly = {
      sourceIp: '203.0.113.200',
      type: 'DDOS',
      severity: 'CRITICAL',
      message: '220 requêtes par seconde depuis une IP externe',
      count: 220
    };

    networkMonitor.collectNetworkMetrics.mockResolvedValue({ connections });
    networkMonitor.detectAnomalies.mockReturnValue([anomaly]);
    mockPrisma.networkThreat.create.mockResolvedValue({ id: 'threat-ddos-critical' });
    firewallEngine.blockIp.mockResolvedValue({ success: true });

    await detector.detectAndHandleThreats();

    expect(mockPrisma.networkThreat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        threatType: 'DDOS',
        sourceIp: '203.0.113.200',
        destIp: '172.20.0.10',
        destPort: null,
        severity: 'CRITICAL',
        blocked: false,
        metadata: expect.objectContaining({
          message: anomaly.message,
          count: 220,
          ports: [443, 3001],
          protocols: ['TCP'],
          states: ['ESTABLISHED'],
          totalConnections: 2,
          connectionDetails: expect.arrayContaining([
            expect.objectContaining({
              localIp: '172.20.0.10',
              localPort: 443,
              remotePort: 53122,
              protocol: 'TCP',
              state: 'ESTABLISHED',
              containerName: 'jobbingtrack-api-gateway'
            })
          ]),
          containerInfo: expect.objectContaining({
            containerName: 'jobbingtrack-api-gateway',
            containerId: 'gateway-1'
          })
        })
      })
    });
    expect(firewallEngine.blockIp).toHaveBeenCalledWith(
      '203.0.113.200',
      'Auto-block: DDOS (CRITICAL)'
    );
    expect(mockPrisma.networkThreat.update).toHaveBeenCalledWith({
      where: { id: 'threat-ddos-critical' },
      data: { blocked: true }
    });
    expect(mockPrisma.securityAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        level: 'critical',
        title: 'Menace réseau détectée: DDOS',
        category: 'network',
        source: '203.0.113.200'
      })
    });
    expect(securityService.createSecurityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'critical',
        category: 'network',
        eventType: 'network_threat_detected',
        sourceIP: '203.0.113.200',
        riskScore: 90,
        isBlocked: false,
        endpoint: '/internal/network-threat-detector',
        method: 'DETECT',
        metadata: expect.objectContaining({
          threatId: 'threat-ddos-critical',
          threatType: 'DDOS'
        })
      })
    );
    expect(mockPrisma.networkConnection.create).toHaveBeenCalledTimes(2);
  });

  test('ne bloque pas automatiquement une menace moyenne mais garde une trace et une alerte', async () => {
    const connections = [
      {
        remoteIp: '198.51.100.80',
        remotePort: 50000,
        localIp: '172.20.0.12',
        localPort: 3005,
        protocol: 'TCP',
        state: 0x01,
        containerName: 'jobbingtrack-interview-service',
        containerId: 'interview-1'
      }
    ];
    const anomaly = {
      sourceIp: '198.51.100.80',
      type: 'PORT_SCAN',
      severity: 'MEDIUM',
      message: 'Balayage de ports modéré',
      portCount: 6
    };

    networkMonitor.collectNetworkMetrics.mockResolvedValue({ connections });
    networkMonitor.detectAnomalies.mockReturnValue([anomaly]);
    mockPrisma.networkThreat.create.mockResolvedValue({ id: 'threat-port-scan-medium' });

    await detector.detectAndHandleThreats();

    expect(firewallEngine.blockIp).not.toHaveBeenCalled();
    expect(mockPrisma.networkThreat.update).not.toHaveBeenCalledWith({
      where: { id: 'threat-port-scan-medium' },
      data: { blocked: true }
    });
    expect(mockPrisma.networkThreat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        threatType: 'PORT_SCAN',
        sourceIp: '198.51.100.80',
        destIp: '172.20.0.12',
        destPort: 3005,
        severity: 'MEDIUM',
        metadata: expect.objectContaining({
          message: anomaly.message,
          count: 6,
          ports: [3005],
          totalConnections: 1
        })
      })
    });
    expect(mockPrisma.securityAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        level: 'medium',
        title: 'Menace réseau détectée: PORT_SCAN',
        source: '198.51.100.80'
      })
    });
    expect(securityService.createSecurityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        eventType: 'network_threat_detected',
        sourceIP: '198.51.100.80',
        riskScore: 50,
        isBlocked: false
      })
    );
  });

  test('ignore les anomalies BRUTE_FORCE issues du bridge Docker en mode relax', async () => {
    const connections = [
      {
        remoteIp: '172.19.0.16',
        remotePort: 53122,
        localIp: '172.19.0.2',
        localPort: 5432,
        protocol: 'TCP',
        state: 0x01,
        containerName: 'jobbingtrack-postgres',
        containerId: 'postgres-1'
      }
    ];
    const anomaly = {
      sourceIp: '172.19.0.16',
      type: 'BRUTE_FORCE',
      severity: 'MEDIUM',
      message: 'Connexions TIME_WAIT internes Docker',
      count: 42
    };

    networkMonitor.collectNetworkMetrics.mockResolvedValue({ connections });
    networkMonitor.detectAnomalies.mockReturnValue([anomaly]);
    networkMonitor.shouldSkipInternalNetworkAnomalies.mockReturnValue(true);

    await detector.detectAndHandleThreats();

    expect(mockPrisma.networkThreat.create).not.toHaveBeenCalled();
    expect(mockPrisma.securityAlert.create).not.toHaveBeenCalled();
    expect(securityService.createSecurityLog).not.toHaveBeenCalled();
    expect(firewallEngine.blockIp).not.toHaveBeenCalled();
    expect(mockPrisma.networkConnection.create).toHaveBeenCalledTimes(1);
  });
});
