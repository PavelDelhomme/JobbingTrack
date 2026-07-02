const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createRelease,
  getPublicReleaseInfo,
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
});
