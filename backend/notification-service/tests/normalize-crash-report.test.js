const zlib = require('zlib');
const { normalizeCrashReport, buildEffectiveStackTrace } = require('../src/utils/normalizeCrashReport');
const { buildCrashReportEmailHtml } = require('../src/templates/crashReportEmailHtml');

function compressJson(obj) {
  const raw = Buffer.from(JSON.stringify(obj), 'utf8');
  const compressed = zlib.gzipSync(raw);
  return `gz:${compressed.toString('base64')}`;
}

function compressPngPlaceholder() {
  // PNG 1x1 transparent
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  return `gz:${zlib.gzipSync(png).toString('base64')}`;
}

describe('normalizeCrashReport', () => {
  test('marque un retour user_feedback et propage category dans metadata', () => {
    const report = normalizeCrashReport({
      crashType: 'user_feedback',
      message: 'Mon écran freeze',
      category: 'bug',
    });

    expect(report.metadata.feedback).toBe(true);
    expect(report.metadata.category).toBe('bug');
  });

  test('enrichit écran, session, appareil et actions depuis diagnostic compressé', () => {
    const diagnostic = {
      deviceModel: 'samsung SM-G990B2',
      osVersion: 'Android 16 (API 36)',
      memoryRssMb: '385.4',
      sessionId: 'mqjpepqs',
      analytics: { currentScreen: '/settings' },
      recentActions: ['nav /home → /settings', 'tap help_feedback'],
      recentErrors: [{ type: 'network_error', message: 'timeout', screen: '/home' }],
    };

    const report = normalizeCrashReport({
      crashType: 'ManualReport',
      message: '[bug] Bouton ne répond pas',
      metadata: {
        feedback: true,
        category: 'bug',
        diagnosticCompressed: compressJson(diagnostic),
      },
    });

    expect(report.screenName).toBe('/settings');
    expect(report.sessionId).toBe('mqjpepqs');
    expect(report.deviceInfo.deviceModel).toBe('samsung SM-G990B2');
    expect(report.userActions).toEqual(diagnostic.recentActions);
    expect(report.effectiveStackTrace).toContain('network_error');
  });

  test('décompresse screenshotCompressed en data URL', () => {
    const report = normalizeCrashReport({
      crashType: 'ManualReport',
      message: '[bug] avec capture',
      metadata: {
        feedback: true,
        category: 'bug',
        screenshotCompressed: compressPngPlaceholder(),
      },
    });

    expect(report.screenshotDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('buildEffectiveStackTrace', () => {
  test('retour manuel sans exception produit un contexte lisible', () => {
    const trace = buildEffectiveStackTrace({
      metadata: { feedback: true },
      sessionId: 'abc',
      screenName: 'help_feedback/bug',
    });
    expect(trace).toContain('Retour manuel');
    expect(trace).toContain('abc');
  });
});

describe('buildCrashReportEmailHtml', () => {
  test('affiche capture inline et stack trace contextualisée', () => {
    const html = buildCrashReportEmailHtml({
      crashType: 'ManualReport',
      message: '[bug] Test',
      stackTrace: null,
      effectiveStackTrace: '(Retour manuel — aucune exception capturée au moment de l\'envoi.)',
      deviceInfo: {
        platform: 'android',
        osVersion: 'Android 16',
        deviceModel: 'samsung SM-G990B2',
        appVersion: '1.0.0+1',
      },
      appVersion: '1.0.0+1',
      sessionId: 'mqjpepqs',
      screenName: '/settings',
      userActions: ['nav /home → /settings'],
      metadata: { feedback: true, category: 'bug' },
      diagnostic: { deviceModel: 'samsung SM-G990B2' },
      userId: 'anonymous',
      timestamp: '18/06/2026 17:00:00',
      screenshotAttached: true,
      screenshotDataUrl: 'data:image/png;base64,abc',
    });

    expect(html).toContain('Capture d\'écran');
    expect(html).toContain('data:image/png;base64,abc');
    expect(html).toContain('Retour manuel');
    expect(html).toContain('Stack trace / contexte technique');
  });
});
