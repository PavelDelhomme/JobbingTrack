const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createRelease,
  getPublicReleaseInfo,
  listAdminState,
  promoteRelease,
  updateChannelPolicy,
} = require('../src/services/mobileReleaseStore');

describe('mobileReleaseStore', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-mobile-rel-'));
    process.env.MOBILE_RELEASES_DIR = tempDir;
    process.env.PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    delete process.env.MOBILE_RELEASES_DIR;
    delete process.env.PUBLIC_API_URL;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('createRelease dev android + public latest', () => {
    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '1.2.0',
      buildNumber: 3,
      releaseNotes: 'Test dev',
      filename: 'jobbingtrack-1.2.0+3.apk',
      createdBy: 'admin@test',
    });

    const info = getPublicReleaseInfo('android', 'dev');
    expect(info.version).toBe('1.2.0');
    expect(info.buildNumber).toBe(3);
    expect(info.channel).toBe('dev');
    expect(info.downloadUrl).toContain(encodeURIComponent('jobbingtrack-1.2.0+3.apk'));
  });

  it('promote dev to production', () => {
    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '2.0.0',
      buildNumber: 10,
      filename: 'jobbingtrack-2.0.0+10.apk',
    });

    const promoted = promoteRelease({ platform: 'android' });
    expect(promoted.channel).toBe('production');
    expect(promoted.version).toBe('2.0.0');

    const prod = getPublicReleaseInfo('android', 'production');
    expect(prod.version).toBe('2.0.0');
  });

  it('channel policy forceUpdate', () => {
    updateChannelPolicy('production', 'android', { forceUpdate: true });
    const info = getPublicReleaseInfo('android', 'production');
    expect(info.forceUpdate).toBe(true);
  });

  it('listAdminState expose deployHints', () => {
    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '1.0.0',
      buildNumber: 7,
      filename: 'jobbingtrack-1.0.0+7.apk',
    });

    const state = listAdminState();
    expect(state.deployHints.publicApiUrl).toBe('https://api.example.com');
    expect(state.deployHints.suggestedVersion).toBe('1.0.0');
    expect(state.deployHints.suggestedBuild).toBeGreaterThanOrEqual(8);
  });

  it('downloadUrl utilise MOBILE_DEV_LAN_HOST quand PUBLIC_API_URL est *.localhost', () => {
    process.env.PUBLIC_API_URL = 'https://api.jobbingtrack.localhost:5443';
    process.env.MOBILE_DEV_LAN_HOST = '192.168.1.134';
    process.env.API_GATEWAY_PORT = '5002';

    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '1.0.1',
      buildNumber: 2,
      filename: 'smoke-test.apk',
    });

    const info = getPublicReleaseInfo('android', 'dev');
    expect(info.downloadUrl).toBe(
      'http://192.168.1.134:5002/api/v1/mobile/releases/download/smoke-test.apk',
    );

    delete process.env.MOBILE_DEV_LAN_HOST;
    delete process.env.API_GATEWAY_PORT;
  });
});
