const { safeApkFilename } = require('../src/middleware/mobileApkUpload');

describe('mobileApkUpload', () => {
  it('safeApkFilename conserve .apk et nettoie le nom', () => {
    const name = safeApkFilename('../../../evil release!.apk');
    expect(name.endsWith('.apk')).toBe(true);
    expect(name).not.toContain('..');
    expect(name).not.toContain('/');
  });
});
