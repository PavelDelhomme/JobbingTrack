jest.mock('../src/config/database', () => ({
  prisma: {
    networkThreat: { findMany: jest.fn() },
    aggregatedLog: { findMany: jest.fn() },
    securityLog: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

jest.mock('../src/services/auditService', () => ({
  listAuditEvents: jest.fn(),
  recordAuditEvent: jest.fn(),
  auditFromRequest: jest.fn((req, base) => ({
    actorUserId: req.user?.id || null,
    actorEmail: req.user?.email || null,
    ...base,
  })),
}));

const { prisma } = require('../src/config/database');
const auditService = require('../src/services/auditService');
const investigationService = require('../src/services/investigationService');

describe('investigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.networkThreat.findMany.mockResolvedValue([
      {
        id: 'threat-1',
        threatType: 'DDOS',
        severity: 'HIGH',
        sourceIp: '203.0.113.10',
        destIp: '10.0.0.1',
        destPort: 443,
        blocked: false,
        detectedAt: new Date('2026-06-15T10:00:00Z'),
        message: 'lab ddos',
      },
    ]);
    prisma.aggregatedLog.findMany.mockResolvedValue([
      {
        id: 'agg-1',
        timestamp: new Date('2026-06-15T10:05:00Z'),
        serviceName: 'api-gateway',
        level: 'WARN',
        message: 'rate limit',
        requestId: 'req-lab-1',
        userId: 'user-42',
        metadata: { clientIp: '203.0.113.10', method: 'GET', endpoint: '/api/v1/x' },
      },
    ]);
    prisma.securityLog.findMany.mockResolvedValue([
      {
        id: 'sec-1',
        timestamp: new Date('2026-06-15T10:04:00Z'),
        level: 'warning',
        category: 'auth',
        eventType: 'login_failure',
        message: 'failed login',
        sourceIP: '203.0.113.10',
        userId: 'user-42',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        statusCode: 401,
        isBlocked: false,
        metadata: { requestId: 'req-lab-1' },
      },
    ]);
    auditService.listAuditEvents.mockResolvedValue({
      rows: [
        {
          id: 'audit-1',
          timestamp: new Date('2026-06-15T10:03:00Z'),
          action: 'admin_login_failure',
          resource: 'authentication',
          resourceId: 'user-42',
          outcome: 'failure',
          actorUserId: 'user-42',
          actorEmail: null,
          clientIp: '203.0.113.10',
          requestId: 'req-lab-1',
          metadata: {},
        },
      ],
      total: 1,
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-42',
        email: 'admin@lab.test',
        firstName: 'Admin',
        lastName: 'Lab',
        role: 'ADMIN',
        lastLoginAt: new Date('2026-06-14T08:00:00Z'),
      },
    ]);
  });

  it('agrège menaces, logs et comptes impactés avec filtres IP/requestId', async () => {
    const result = await investigationService.searchInvestigation({
      sourceIp: '203.0.113.10',
      requestId: 'req-lab-1',
      limit: 50,
    });

    expect(result.threats).toHaveLength(1);
    expect(result.aggregatedLogs[0].requestId).toBe('req-lab-1');
    expect(result.securityLogs[0].userId).toBe('user-42');
    expect(result.impactedAccounts).toHaveLength(1);
    expect(result.impactedAccounts[0]).toEqual(
      expect.objectContaining({
        userId: 'user-42',
        email: 'admin@lab.test',
        displayName: 'Admin Lab',
        role: 'ADMIN',
        profileSource: 'users_table',
        loginFailures: 1,
        sources: expect.arrayContaining(['audit_logs', 'security_logs', 'aggregated_logs']),
      })
    );
    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  it('construit un bundle export JSON avec sections demandées', async () => {
    const { bundle } = await investigationService.buildExportBundle(
      { sourceIp: '203.0.113.10' },
      ['threats', 'impactedAccounts']
    );
    expect(bundle.sections).toEqual(['threats', 'impactedAccounts']);
    expect(bundle.threats).toHaveLength(1);
    expect(bundle.impactedAccounts).toHaveLength(1);
    expect(bundle.auditEvents).toBeUndefined();
  });

  it('exportInvestigation enregistre security_export et produit du CSV menaces', async () => {
    auditService.recordAuditEvent.mockResolvedValue({ id: 'audit-export-1' });
    const req = { user: { id: 'admin-1', email: 'admin@test', role: 'ADMIN' }, ip: '127.0.0.1' };
    const exported = await investigationService.exportInvestigation(req, {}, {
      sections: ['threats'],
      format: 'csv',
    });

    expect(auditService.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'security_export', resource: 'investigation' })
    );
    expect(exported.format).toBe('csv');
    expect(exported.content).toContain('threat-1');
    expect(exported.content).toContain('203.0.113.10');
  });
});

describe('buildImpactedAccounts', () => {
  it('ignore les audits non-auth', () => {
    const accounts = investigationService.buildImpactedAccounts(
      [{ action: 'ip_unblock', timestamp: new Date(), clientIp: '1.1.1.1' }],
      [],
      []
    );
    expect(accounts).toEqual([]);
  });
});
