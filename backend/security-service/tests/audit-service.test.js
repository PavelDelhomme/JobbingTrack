const { redactSensitiveMetadata } = require('../src/services/securityAlertEmailNotifier');

jest.mock('../src/config/database', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const { prisma } = require('../src/config/database');
const auditService = require('../src/services/auditService');

describe('auditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redige les métadonnées sensibles avant insert', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    await auditService.recordAuditEvent({
      action: 'ip_unblock',
      resource: 'firewall_ip',
      resourceId: '203.0.113.42',
      metadata: { smtp_pass: 'secret', note: 'lab' },
    });
    const payload = prisma.auditLog.create.mock.calls[0][0].data;
    expect(payload.metadata.smtp_pass).toBe('[redacted]');
    expect(payload.metadata.note).toBe('lab');
  });

  it('listAuditEvents retourne vide si table absente', async () => {
    prisma.auditLog.findMany.mockRejectedValue({ code: 'P2021' });
    prisma.auditLog.count.mockRejectedValue({ code: 'P2021' });
    const result = await auditService.listAuditEvents({ limit: 10 });
    expect(result.rows).toEqual([]);
    expect(result.tableMissing).toBe(true);
  });
});

describe('redactSensitiveMetadata', () => {
  it('masque les clés sensibles connues', () => {
    const out = redactSensitiveMetadata({ password: 'x', requestId: 'abc' });
    expect(out.password).toBe('[redacted]');
    expect(out.requestId).toBe('abc');
  });
});
