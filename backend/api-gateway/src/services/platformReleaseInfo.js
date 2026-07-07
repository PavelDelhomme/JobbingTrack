const fs = require('fs');
const path = require('path');

const packageJson = require('../../package.json');

const DEFAULT_MANIFEST_RELATIVE = path.join('release-manifest', 'platform-manifest.json');

function resolveManifestPath() {
  if (process.env.PLATFORM_MANIFEST_PATH?.trim()) {
    return process.env.PLATFORM_MANIFEST_PATH.trim();
  }
  return path.join(__dirname, '..', DEFAULT_MANIFEST_RELATIVE);
}

function readManifestFile() {
  const manifestPath = resolveManifestPath();
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildMobileSection(manifest, getPublicReleaseInfo) {
  const androidFromStore = getPublicReleaseInfo('android', 'production');
  const iosFromStore = getPublicReleaseInfo('ios', 'production');
  const manifestAndroid = manifest?.mobile?.android || {};
  const manifestIos = manifest?.mobile?.ios || {};

  return {
    android: {
      minVersion: androidFromStore?.minVersion ?? manifestAndroid.minVersion ?? '0.0.0',
      minBuild: androidFromStore?.minBuild ?? manifestAndroid.minBuild ?? 0,
      latestVersion: androidFromStore?.version ?? manifestAndroid.version ?? null,
      latestBuild: androidFromStore?.buildNumber ?? manifestAndroid.buildNumber ?? null,
      forceUpdate: androidFromStore?.forceUpdate === true || manifestAndroid.forceUpdate === true,
    },
    ios: {
      minVersion: iosFromStore?.minVersion ?? manifestIos.minVersion ?? '0.0.0',
      minBuild: iosFromStore?.minBuild ?? manifestIos.minBuild ?? 0,
      latestVersion: iosFromStore?.version ?? manifestIos.version ?? null,
      latestBuild: iosFromStore?.buildNumber ?? manifestIos.buildNumber ?? null,
      forceUpdate: iosFromStore?.forceUpdate === true || manifestIos.forceUpdate === true,
    },
  };
}

/**
 * Payload public minimal — pas de SHA, IP, tags Docker complets, secrets.
 */
function getPublicReleaseInfoPayload(getPublicReleaseInfo) {
  const manifest = readManifestFile();
  const platformRelease = manifest?.platformRelease
    || process.env.PLATFORM_RELEASE
    || 'JT-1.0.0';

  const apiVersion = manifest?.components?.['api-gateway']?.version
    || packageJson.version
    || '1.0.0';

  const frontendVersion = manifest?.components?.frontend?.version || null;

  const payload = {
    platformRelease,
    api: { version: apiVersion },
    mobile: buildMobileSection(manifest, getPublicReleaseInfo),
  };

  if (frontendVersion) {
    payload.frontend = { version: frontendVersion };
  }

  return payload;
}

module.exports = {
  resolveManifestPath,
  readManifestFile,
  getPublicReleaseInfoPayload,
};
