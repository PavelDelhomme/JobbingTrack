const { getPublicReleaseInfoPayload, readManifestFile, resolveManifestPath } = require('../src/services/platformReleaseInfo');

describe('platformReleaseInfo', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PLATFORM_RELEASE;
    delete process.env.PLATFORM_MANIFEST_PATH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getPublicReleaseInfoPayload inclut platformRelease et api.version', () => {
    const mockGetPublic = () => ({
      minVersion: '1.0.5',
      minBuild: 5,
      version: '1.0.12',
      buildNumber: 12,
      forceUpdate: false,
    });

    const payload = getPublicReleaseInfoPayload(mockGetPublic);
    expect(payload.platformRelease).toBeDefined();
    expect(payload.api).toHaveProperty('version');
    expect(payload.mobile.android.minVersion).toBe('1.0.5');
    expect(payload.mobile.android.minBuild).toBe(5);
  });

  test('readManifestFile lit le JSON versionné gateway', () => {
    const manifest = readManifestFile();
    if (manifest) {
      expect(manifest.platformRelease).toMatch(/^JT-/);
      expect(manifest.components).toBeDefined();
    } else {
      expect(resolveManifestPath()).toContain('platform-manifest.json');
    }
  });
});
