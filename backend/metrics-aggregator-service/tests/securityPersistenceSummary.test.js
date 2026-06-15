const persistenceService = require('../src/services/persistence.service');

describe('security persistence summary', () => {
  const originalIsDatabaseEnabled = persistenceService.isDatabaseEnabled;
  const originalGetSecurityMetrics = persistenceService.getSecurityMetrics;

  afterEach(() => {
    persistenceService.isDatabaseEnabled = originalIsDatabaseEnabled;
    persistenceService.getSecurityMetrics = originalGetSecurityMetrics;
    jest.restoreAllMocks();
  });

  it('agrège les compteurs sécurité persistés sans masquer les alertes', async () => {
    persistenceService.isDatabaseEnabled = jest.fn(() => true);
    persistenceService.getSecurityMetrics = jest.fn(async () => [
      {
        failedLoginAttempts: 2,
        suspiciousActivities: 4,
        activeSecurityAlerts: 1,
        potentialSqlInjections: 3,
        potentialXssAttempts: 0,
        securityScore: 80,
        blockedIPs: ['203.0.113.52'],
        source: 'security_metrics',
      },
      {
        failedLoginAttempts: 0,
        suspiciousActivities: 1,
        activeSecurityAlerts: 2,
        potentialSqlInjections: 0,
        potentialXssAttempts: 5,
        securityScore: 60,
        blockedIPs: ['203.0.113.52', '203.0.113.53'],
        source: 'security_metrics',
      },
    ]);

    const summary = await persistenceService.getSecuritySummary(168);

    expect(summary).toMatchObject({
      avgSecurityScore: 70,
      totalFailedLogins: 2,
      totalSuspiciousActivities: 5,
      totalSecurityAlerts: 3,
      totalSqlInjectionAttempts: 3,
      totalXssAttempts: 5,
      uniqueBlockedIPs: 2,
      period: '168h',
      dataPoints: 2,
      source: 'security_metrics',
    });
  });

  it('expose une source empty quand la fenêtre persistée est vide', async () => {
    persistenceService.isDatabaseEnabled = jest.fn(() => true);
    persistenceService.getSecurityMetrics = jest.fn(async () => []);

    const summary = await persistenceService.getSecuritySummary(168);

    expect(summary.dataPoints).toBe(0);
    expect(summary.source).toBe('empty');
    expect(summary.avgSecurityScore).toBe(100);
  });
});
