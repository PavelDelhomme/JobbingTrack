const mockPrisma = {};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('../src/network-monitor', () => ({}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  logSecurityEvent: jest.fn()
}));

jest.mock('../src/services/securityService', () => ({
  createSecurityLog: jest.fn().mockResolvedValue({})
}));

jest.mock('../src/services/passwordReauth', () => ({
  verifyCurrentPassword: jest.fn()
}));

jest.mock('../src/services/securityNotificationSettings', () => ({
  getEffectiveSettings: jest.fn(),
  saveSettings: jest.fn()
}));

jest.mock('../src/services/securityAlertEmailNotifier', () => ({
  notifySecurityAlert: jest.fn()
}));

const { verifyCurrentPassword } = require('../src/services/passwordReauth');
const securityNotificationSettings = require('../src/services/securityNotificationSettings');
const securityAlertEmailNotifier = require('../src/services/securityAlertEmailNotifier');
const notificationSettingsController = require('../src/controllers/notificationSettingsController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockRequest(body = {}, user = { id: 'admin-1', email: 'admin@test.com', role: 'SUPER_ADMIN' }) {
  return {
    body,
    ip: '127.0.0.1',
    connection: {},
    originalUrl: '/api/v1/security/notification-settings',
    method: 'PUT',
    headers: { authorization: 'Bearer test-token' },
    user
  };
}

describe('Notification settings - réauth et test email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyCurrentPassword.mockResolvedValue({ ok: true });
    securityNotificationSettings.getEffectiveSettings.mockReturnValue({
      enabled: true,
      recipients: ['alert@test.com'],
      levels: ['critical', 'high'],
      source: 'file'
    });
    securityNotificationSettings.saveSettings.mockReturnValue({
      enabled: true,
      recipients: ['alert@test.com', 'ops@test.com'],
      levels: ['critical', 'high'],
      updatedAt: new Date().toISOString()
    });
    securityAlertEmailNotifier.notifySecurityAlert.mockResolvedValue({
      sent: true,
      results: [{ to: 'alert@test.com', sent: true }]
    });
  });

  test('refuse la mise à jour sans réauthentification valide', async () => {
    verifyCurrentPassword.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Mot de passe incorrect'
    });
    const res = mockResponse();
    await notificationSettingsController.updateNotificationSettings(
      mockRequest({ recipients: ['ops@test.com'], currentPassword: 'wrong' }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(securityNotificationSettings.saveSettings).not.toHaveBeenCalled();
  });

  test('sauvegarde les paramètres après réauthentification', async () => {
    const res = mockResponse();
    await notificationSettingsController.updateNotificationSettings(
      mockRequest({
        recipients: ['alert@test.com', 'ops@test.com'],
        levels: ['critical', 'high'],
        enabled: true,
        currentPassword: 'secret'
      }),
      res
    );

    expect(verifyCurrentPassword).toHaveBeenCalled();
    expect(securityNotificationSettings.saveSettings).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('envoie un email de test après réauthentification', async () => {
    const res = mockResponse();
    await notificationSettingsController.sendTestNotificationEmail(
      mockRequest({ currentPassword: 'secret' }),
      res
    );

    expect(securityAlertEmailNotifier.notifySecurityAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'high',
        source: 'notification-settings-test'
      })
    );
    expect(res.status).toHaveBeenCalledWith(202);
  });

  test('refuse le test si les alertes sont désactivées', async () => {
    securityNotificationSettings.getEffectiveSettings.mockReturnValue({
      enabled: false,
      recipients: ['alert@test.com'],
      levels: ['critical', 'high']
    });
    const res = mockResponse();
    await notificationSettingsController.sendTestNotificationEmail(
      mockRequest({ currentPassword: 'secret' }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(securityAlertEmailNotifier.notifySecurityAlert).not.toHaveBeenCalled();
  });
});
