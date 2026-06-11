const {
  buildPayload,
  redactSensitiveMetadata,
  buildDiagnosticLinks
} = require('../src/services/securityAlertEmailNotifier');

describe('Security alert email payload', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BACKOFFICE_FRONTEND_URL: 'https://jobbingtrack.localhost:5443/b4ck0ff1ce'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('redige les champs sensibles des metadonnees', () => {
    expect(
      redactSensitiveMetadata({
        serviceName: 'jobbingtrack-auth-service',
        smtp_pass: 'secret-value',
        requestId: 'req-123',
        nested: { apiKey: 'abc', status: 'down' }
      })
    ).toEqual({
      serviceName: 'jobbingtrack-auth-service',
      smtp_pass: '[redacted]',
      requestId: 'req-123',
      nested: { apiKey: '[redacted]', status: 'down' }
    });
  });

  test('inclut le contexte utile et les liens diagnostic', () => {
    const payload = buildPayload({
      id: 'alert-1',
      level: 'critical',
      title: 'Service critique indisponible: jobbingtrack-auth-service',
      category: 'availability',
      source: 'jobbingtrack-auth-service',
      description: 'Le service critique jobbingtrack-auth-service n\'est plus en état running.',
      metadata: {
        alertType: 'SERVICE_DOWN',
        serviceName: 'jobbingtrack-auth-service',
        status: 'exited',
        error: 'connect ECONNREFUSED',
        smtp_pass: 'hidden'
      }
    });

    expect(payload.subject).toContain('CRITICAL');
    expect(payload.html).toContain('Service touché');
    expect(payload.html).toContain('jobbingtrack-auth-service');
    expect(payload.html).toContain('Email Monitor — notifications');
    expect(payload.html).toContain('/b4ck0ff1ce/email-monitor?type=NOTIFICATION');
    expect(payload.html).toContain('[redacted]');
    expect(payload.html).not.toContain('hidden');
  });

  test('construit les liens backoffice depuis FRONTEND_URL', () => {
    delete process.env.BACKOFFICE_FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://jobbingtrack.localhost:5443';

    expect(buildDiagnosticLinks()).toEqual({
      emailMonitor: 'https://jobbingtrack.localhost:5443/b4ck0ff1ce/email-monitor?type=NOTIFICATION',
      security: 'https://jobbingtrack.localhost:5443/b4ck0ff1ce/security',
      securityAlerts: 'https://jobbingtrack.localhost:5443/b4ck0ff1ce/security/alerts'
    });
  });
});
