jest.mock('axios', () => ({
  get: jest.fn()
}));

jest.mock('../src/services/securityService', () => ({
  createSecurityAlert: jest.fn()
}));

jest.mock('../src/services/networkThreatDetector', () => ({
  startDetection: jest.fn(),
  stopDetection: jest.fn()
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

const axios = require('axios');
const securityService = require('../src/services/securityService');
const securityScheduler = require('../src/services/securityScheduler');

describe('SecurityScheduler - alertes disponibilité services', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      METRICS_SERVICE_URL: 'http://metrics.local',
      METRICS_API_KEY: 'metrics-test-key',
      SECURITY_CRITICAL_SERVICES: 'jobbingtrack-api-gateway,jobbingtrack-redis',
      SECURITY_SERVICE_DOWN_DEDUP_MINUTES: '30'
    };
    securityScheduler.availabilityAlertState.clear();
    securityService.createSecurityAlert.mockResolvedValue({ id: 'alert-service-down' });
  });

  afterAll(() => {
    process.env = originalEnv;
    securityScheduler.stop();
  });

  test('crée une alerte critique uniquement pour un service critique arrêté', async () => {
    axios.get.mockResolvedValue({
      data: {
        services: [
          {
            name: 'jobbingtrack-api-gateway',
            status: 'exited',
            is_running: false,
            image: 'jobbingtrack-api-gateway',
            ports: '0.0.0.0:5002->3002/tcp'
          },
          {
            name: 'jobbingtrack-worker-dev',
            status: 'exited',
            is_running: false
          },
          {
            name: 'jobbingtrack-redis',
            status: 'running',
            is_running: true
          }
        ]
      }
    });

    const result = await securityScheduler.checkServiceAvailabilityAlerts();

    expect(result).toEqual({ checked: 3, alerts: 1 });
    expect(axios.get).toHaveBeenCalledWith(
      'http://metrics.local/api/v1/docker/services/all',
      {
        timeout: 5000,
        headers: { 'X-API-Key': 'metrics-test-key' }
      }
    );
    expect(securityService.createSecurityAlert).toHaveBeenCalledTimes(1);
    expect(securityService.createSecurityAlert).toHaveBeenCalledWith({
      level: 'critical',
      title: 'Service critique indisponible: jobbingtrack-api-gateway',
      description: 'Le service critique jobbingtrack-api-gateway n\'est plus en état running.',
      category: 'availability',
      source: 'jobbingtrack-api-gateway',
      metadata: expect.objectContaining({
        alertType: 'SERVICE_DOWN',
        serviceName: 'jobbingtrack-api-gateway',
        status: 'exited',
        isRunning: false
      })
    });
  });

  test('déduplique les alertes service down dans la fenêtre configurée', async () => {
    axios.get.mockResolvedValue({
      data: {
        services: [
          {
            name: 'jobbingtrack-api-gateway',
            status: 'exited',
            is_running: false
          }
        ]
      }
    });

    await securityScheduler.checkServiceAvailabilityAlerts();
    const result = await securityScheduler.checkServiceAvailabilityAlerts();

    expect(result).toEqual({ checked: 1, alerts: 0 });
    expect(securityService.createSecurityAlert).toHaveBeenCalledTimes(1);
  });

  test('alerte si le metrics-aggregator ne permet plus de lire la santé services', async () => {
    axios.get.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await securityScheduler.checkServiceAvailabilityAlerts();

    expect(result).toEqual({ checked: 0, alerts: 1, error: 'connect ECONNREFUSED' });
    expect(securityService.createSecurityAlert).toHaveBeenCalledWith({
      level: 'critical',
      title: 'Metrics aggregator indisponible',
      description: 'Impossible de récupérer la santé des services depuis le metrics-aggregator: connect ECONNREFUSED',
      category: 'availability',
      source: 'jobbingtrack-metrics-aggregator',
      metadata: expect.objectContaining({
        alertType: 'SERVICE_DOWN',
        reason: 'metrics_aggregator_unreachable',
        metricsServiceUrl: 'http://metrics.local'
      })
    });
  });

  test('n’alerte pas si seul le endpoint services/all timeout mais que le healthcheck répond', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'))
      .mockResolvedValueOnce({
        status: 200,
        data: { status: 'online' }
      });

    const result = await securityScheduler.checkServiceAvailabilityAlerts();

    expect(result).toEqual({
      checked: 0,
      alerts: 0,
      degraded: true,
      error: 'timeout of 5000ms exceeded'
    });
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'http://metrics.local/api/v1/health',
      {
        timeout: 3000,
        headers: { 'X-API-Key': 'metrics-test-key' }
      }
    );
    expect(securityService.createSecurityAlert).not.toHaveBeenCalled();
  });
});
