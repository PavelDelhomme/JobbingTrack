const { getMobileReleaseInfoFromEnv, buildDownloadUrl } = require('../src/lib/mobileReleaseConfigEnv');

describe('mobileReleaseConfig', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('buildDownloadUrl from PUBLIC_API_URL + filename', () => {
    process.env.PUBLIC_API_URL = 'https://api.example.com/';
    process.env.MOBILE_ANDROID_APK_FILENAME = 'jobbingtrack-1.0.1.apk';
    delete process.env.MOBILE_ANDROID_DOWNLOAD_URL;
    expect(buildDownloadUrl()).toBe(
      'https://api.example.com/api/v1/mobile/releases/download/jobbingtrack-1.0.1.apk',
    );
  });

  it('getMobileReleaseInfo android', () => {
    process.env.MOBILE_ANDROID_LATEST_VERSION = '1.2.0';
    process.env.MOBILE_ANDROID_LATEST_BUILD = '5';
    process.env.MOBILE_ANDROID_MIN_VERSION = '1.0.0';
    process.env.MOBILE_ANDROID_MIN_BUILD = '1';
    process.env.MOBILE_ANDROID_FORCE_UPDATE = 'true';
    process.env.MOBILE_ANDROID_DOWNLOAD_URL = 'https://cdn.example/apk';

    const info = getMobileReleaseInfoFromEnv('android');
    expect(info.version).toBe('1.2.0');
    expect(info.buildNumber).toBe(5);
    expect(info.forceUpdate).toBe(true);
    expect(info.downloadUrl).toBe('https://cdn.example/apk');
  });
});
