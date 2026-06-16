jest.mock('axios', () => ({
  post: jest.fn()
}));

jest.mock('../src/services/securityNotificationSettings', () => ({
  getEffectiveSettings: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

const axios = require('axios');
const securityNotificationSettings = require('../src/services/securityNotificationSettings');
const {
  buildPayload,
  notifySecurityAlert,
  resetNotificationRateLimitForTests,
  resolveNotificationWindow
} = require('../src/services/securityAlertEmailNotifier');

const baseAlert = {
  id: 'alert-1',
  level: 'critical',
  title: 'Service critique indisponible',
  category: 'availability',
  source: 'metrics-aggregator',
  description: 'Le service metrics-aggregator est indisponible.',
  metadata: {
    alertType: 'SERVICE_DOWN',
    serviceName: 'metrics-aggregator'
  }
};

describe('securityAlertEmailNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationRateLimitForTests();
    process.env.NOTIFICATION_SERVICE_URL = 'http://notification-service:3006';
    process.env.SECURITY_INTERNAL_SECRET = 'internal-secret';
    process.env.SECURITY_ALERT_EMAIL_RATE_LIMIT_WINDOW_MS = '900000';
    securityNotificationSettings.getEffectiveSettings.mockReturnValue({
      enabled: true,
      recipients: ['security@jobbingtrack.test'],
      levels: ['critical', 'high']
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  afterAll(() => {
    delete process.env.NOTIFICATION_SERVICE_URL;
    delete process.env.SECURITY_INTERNAL_SECRET;
    delete process.env.SECURITY_ALERT_EMAIL_RATE_LIMIT_WINDOW_MS;
  });

  test('envoie le premier email puis regroupe les alertes similaires', async () => {
    const first = await notifySecurityAlert(baseAlert);
    const second = await notifySecurityAlert({ ...baseAlert, id: 'alert-2' });

    expect(first.sent).toBe(true);
    expect(second).toEqual(
      expect.objectContaining({
        sent: false,
        reason: 'rate_limited',
        suppressedCount: 1
      })
    );
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('autorise une nouvelle fenêtre avec le compteur regroupé', () => {
    const first = resolveNotificationWindow(baseAlert, 1000);
    const grouped = resolveNotificationWindow({ ...baseAlert, id: 'alert-2' }, 2000);
    const next = resolveNotificationWindow({ ...baseAlert, id: 'alert-3' }, 901001);

    expect(first.allowed).toBe(true);
    expect(grouped.allowed).toBe(false);
    expect(next).toEqual(
      expect.objectContaining({
        allowed: true,
        suppressedSinceLastEmail: 1
      })
    );
  });

  test('affiche le regroupement sans exposer de secret', () => {
    const payload = buildPayload({
      ...baseAlert,
      metadata: {
        ...baseAlert.metadata,
        smtp_pass: 'secret',
        notification: {
          groupKey: 'critical|availability|service_down|metrics-aggregator',
          rateLimitWindowMs: 900000,
          suppressedSinceLastEmail: 3
        }
      }
    });

    expect(payload.html).toContain('Alertes similaires regroupées');
    expect(payload.html).toContain('3 dans les 15 min précédentes');
    expect(payload.html).toContain('[redacted]');
    expect(payload.html).not.toContain('secret');
  });
});
