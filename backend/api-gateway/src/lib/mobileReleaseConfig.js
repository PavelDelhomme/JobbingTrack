function parseBuild(value, fallback = 0) {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildDownloadUrl() {
  const override = process.env.MOBILE_ANDROID_DOWNLOAD_URL?.trim();
  if (override) return override;

  const filename = process.env.MOBILE_ANDROID_APK_FILENAME?.trim();
  const publicApi = process.env.PUBLIC_API_URL?.trim();
  if (!filename || !publicApi) return null;

  return `${publicApi.replace(/\/$/, '')}/api/v1/mobile/releases/download/${encodeURIComponent(filename)}`;
}

function getMobileReleaseInfo(platformRaw) {
  const platform = String(platformRaw || 'android').toLowerCase();

  if (platform === 'ios') {
    return {
      platform: 'ios',
      version: process.env.MOBILE_IOS_LATEST_VERSION || '1.0.0',
      buildNumber: parseBuild(process.env.MOBILE_IOS_LATEST_BUILD, 1),
      minVersion: process.env.MOBILE_IOS_MIN_VERSION || '0.0.0',
      minBuild: parseBuild(process.env.MOBILE_IOS_MIN_BUILD, 0),
      storeUrl: process.env.MOBILE_IOS_APP_STORE_URL?.trim() || null,
      downloadUrl: process.env.MOBILE_IOS_APP_STORE_URL?.trim() || null,
      forceUpdate: process.env.MOBILE_IOS_FORCE_UPDATE === 'true',
      releaseNotes: process.env.MOBILE_IOS_RELEASE_NOTES || '',
    };
  }

  if (platform !== 'android') return null;

  return {
    platform: 'android',
    version: process.env.MOBILE_ANDROID_LATEST_VERSION || '1.0.0',
    buildNumber: parseBuild(process.env.MOBILE_ANDROID_LATEST_BUILD, 1),
    minVersion: process.env.MOBILE_ANDROID_MIN_VERSION || '0.0.0',
    minBuild: parseBuild(process.env.MOBILE_ANDROID_MIN_BUILD, 0),
    downloadUrl: buildDownloadUrl(),
    forceUpdate: process.env.MOBILE_ANDROID_FORCE_UPDATE === 'true',
    releaseNotes: process.env.MOBILE_ANDROID_RELEASE_NOTES || '',
  };
}

module.exports = { getMobileReleaseInfo, buildDownloadUrl };
