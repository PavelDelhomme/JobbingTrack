const mockPrisma = {
  emailLog: {
    create: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn()
}));

const request = require('supertest');
const emailService = require('../src/services/emailService');
const app = require('../src/server');

describe('Notification Service - email interne alerte sécurité', () => {
  beforeEach(() => {
    process.env.SECURITY_INTERNAL_SECRET = 'test-internal-security-secret';
    process.env.SMTP_FROM = 'security@jobbingtrack.test';
    mockPrisma.emailLog.create.mockResolvedValue({ id: 'email-log-1' });
    mockPrisma.emailLog.update.mockResolvedValue({});
    emailService.sendEmail.mockResolvedValue({ messageId: 'message-1' });
  });

  test('refuse un appel sans secret interne valide', async () => {
    const response = await request(app)
      .post('/api/v1/notifications/internal/security-alert-email')
      .send({
        to: 'admin@jobbingtrack.test',
        subject: 'Alerte',
        html: '<p>Alerte</p>'
      })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  test('envoie et journalise un email alerte sécurité interne', async () => {
    const response = await request(app)
      .post('/api/v1/notifications/internal/security-alert-email')
      .set('X-Internal-Secret', 'test-internal-security-secret')
      .send({
        to: 'admin@jobbingtrack.test',
        subject: '[Security] DDoS critique',
        html: '<p>DDoS critique</p>',
        alert: {
          id: 'alert-1',
          level: 'critical',
          title: 'DDoS critique'
        }
      })
      .expect(202);

    expect(response.body.success).toBe(true);
    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        to: 'admin@jobbingtrack.test',
        from: 'security@jobbingtrack.test',
        subject: '[Security] DDoS critique',
        type: 'NOTIFICATION',
        status: 'PENDING',
        emailContent: '<p>DDoS critique</p>',
        metadata: expect.objectContaining({
          channel: 'security_alert'
        })
      })
    });
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'admin@jobbingtrack.test',
      '[Security] DDoS critique',
      '<p>DDoS critique</p>'
    );
    expect(mockPrisma.emailLog.update).toHaveBeenCalledWith({
      where: { id: 'email-log-1' },
      data: expect.objectContaining({
        status: 'SENT'
      })
    });
  });
});
