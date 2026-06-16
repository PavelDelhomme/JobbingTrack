const fs = require('fs');
const os = require('os');
const path = require('path');

describe('securityScoreSettings', () => {
  let tmpDir;
  let settingsPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-settings-'));
    settingsPath = path.join(tmpDir, 'security-score-settings.json');
    process.env.SECURITY_SCORE_SETTINGS_PATH = settingsPath;
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.SECURITY_SCORE_SETTINGS_PATH;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('retourne les poids par défaut sans fichier', () => {
    const service = require('../src/services/securityScoreSettings');
    const settings = service.getEffectiveSettings();
    expect(settings.weights).toEqual({
      threats: 2,
      logsNoise: 1,
      wafDisabled: 15,
    });
    expect(settings.source).toBe('default');
  });

  it('sanitize les bornes des poids', () => {
    const service = require('../src/services/securityScoreSettings');
    expect(
      service.sanitizeWeights({ threats: 99, logsNoise: 0, wafDisabled: 3 }),
    ).toEqual({
      threats: 5,
      logsNoise: 1,
      wafDisabled: 5,
    });
  });

  it('persiste et relit les poids', () => {
    const service = require('../src/services/securityScoreSettings');
    const saved = service.saveSettings(
      { weights: { threats: 4, logsNoise: 2, wafDisabled: 20 } },
      { id: 'u1', email: 'admin@test', role: 'ADMIN' },
    );
    expect(saved.weights).toEqual({
      threats: 4,
      logsNoise: 2,
      wafDisabled: 20,
    });
    expect(saved.updatedBy.email).toBe('admin@test');

    jest.resetModules();
    process.env.SECURITY_SCORE_SETTINGS_PATH = settingsPath;
    const reloaded = require('../src/services/securityScoreSettings');
    expect(reloaded.getEffectiveSettings().weights).toEqual(saved.weights);
    expect(reloaded.getEffectiveSettings().source).toBe('file');
  });
});
