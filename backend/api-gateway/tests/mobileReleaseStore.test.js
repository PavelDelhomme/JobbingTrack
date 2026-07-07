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
    expect(state.releases[0].githubTag).toBe('mobile-v1.0.0+7');
  });

  it('publishBuiltApk lit version depuis pubspec si absente', () => {
    const pubspecDir = path.join(tempDir, 'mobile');
    fs.mkdirSync(pubspecDir, { recursive: true });
    fs.writeFileSync(
      path.join(pubspecDir, 'pubspec.yaml'),
      'name: test\nversion: 2.1.0+15\n',
      'utf8',
    );
    process.env.MOBILE_PUBSPEC_PATH = path.join(pubspecDir, 'pubspec.yaml');

    const apkDir = path.join(tempDir, 'apk-build');
    fs.mkdirSync(apkDir, { recursive: true });
    const apkPath = path.join(apkDir, 'app-debug.apk');
    fs.writeFileSync(apkPath, 'fake apk');
    process.env.MOBILE_APK_BUILD_PATH = apkPath;

    const { publishBuiltApk } = require('../src/services/mobileReleaseStore');
    const release = publishBuiltApk({ channel: 'dev', releaseNotes: 'from pubspec' });
    expect(release.version).toBe('2.1.0');
    expect(release.buildNumber).toBe(15);
    expect(release.releaseNotes).toBe('from pubspec');

    delete process.env.MOBILE_PUBSPEC_PATH;
    delete process.env.MOBILE_APK_BUILD_PATH;
  });

  it('downloadUrl utilise chemin relatif en dev *.localhost', () => {
    process.env.PUBLIC_API_URL = 'https://api.jobbingtrack.localhost:5443';

    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '1.0.1',
      buildNumber: 2,
      filename: 'smoke-test.apk',
    });

    const info = getPublicReleaseInfo('android', 'dev');
    expect(info.downloadUrl).toBe('/api/v1/mobile/releases/download/smoke-test.apk');
  });

  it('downloadUrl utilise MOBILE_DEV_LAN_HOST quand base explicite', () => {
    process.env.PUBLIC_API_URL = 'https://api.example.com';
    process.env.MOBILE_ANDROID_DOWNLOAD_BASE_URL = 'http://192.168.1.134:5002';

    createRelease({
      channel: 'dev',
      platform: 'android',
      version: '1.0.2',
      buildNumber: 3,
      filename: 'lan.apk',
    });

    const info = getPublicReleaseInfo('android', 'dev');
    expect(info.downloadUrl).toBe(
      'http://192.168.1.134:5002/api/v1/mobile/releases/download/lan.apk',
    );

    delete process.env.MOBILE_ANDROID_DOWNLOAD_BASE_URL;
  });

  it('migre les auteurs stub user@jobbingtrack.test vers ADMIN_EMAIL', () => {
    process.env.ADMIN_EMAIL = 'admin@jobbingtrack.com';
    const storePath = path.join(tempDir, 'mobile-releases.json');
    const empty = {
      channels: {
        dev: {
          android: { activeReleaseId: null, minVersion: '0.0.0', minBuild: 0, forceUpdate: false },
          ios: { activeReleaseId: null, minVersion: '0.0.0', minBuild: 0, forceUpdate: false },
        },
        production: {
          android: { activeReleaseId: null, minVersion: '0.0.0', minBuild: 0, forceUpdate: false },
          ios: { activeReleaseId: null, minVersion: '0.0.0', minBuild: 0, forceUpdate: false },
        },
      },
      releases: [
        {
          id: 'rel-legacy',
          channel: 'dev',
          platform: 'android',
          version: '1.0.0',
          buildNumber: 1,
          createdBy: 'user@jobbingtrack.test',
          createdAt: '2026-07-06T10:00:00.000Z',
          status: 'superseded',
        },
      ],
    };
    fs.writeFileSync(storePath, JSON.stringify(empty), 'utf8');

    const state = listAdminState();
    expect(state.releases[0].createdBy).toBe('admin@jobbingtrack.com');

    const persisted = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    expect(persisted.releases[0].createdBy).toBe('admin@jobbingtrack.com');
    delete process.env.ADMIN_EMAIL;
  });
});
