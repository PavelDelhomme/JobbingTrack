const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_CHANNELS = ['dev', 'production'];
const DEFAULT_PLATFORMS = ['android', 'ios'];

function releasesDir() {
  return process.env.MOBILE_RELEASES_DIR?.trim() || path.join(process.cwd(), 'mobile-releases');
}

function configPath() {
  return path.join(releasesDir(), 'mobile-releases.json');
}

function emptyStore() {
  const channels = {};
  for (const channel of DEFAULT_CHANNELS) {
    channels[channel] = {};
    for (const platform of DEFAULT_PLATFORMS) {
      channels[channel][platform] = {
        activeReleaseId: null,
        minVersion: '0.0.0',
        minBuild: 0,
        forceUpdate: false,
      };
    }
  }
  return { channels, releases: [] };
}

function ensureDir() {
  const dir = releasesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStore() {
  ensureDir();
  const file = configPath();
  if (!fs.existsSync(file)) {
    const initial = emptyStore();
    fs.writeFileSync(file, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      channels: parsed.channels || emptyStore().channels,
      releases: Array.isArray(parsed.releases) ? parsed.releases : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(configPath(), JSON.stringify(store, null, 2), 'utf8');
}

function newReleaseId() {
  return `rel-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function findRelease(store, id) {
  return store.releases.find((r) => r.id === id) || null;
}

function getActiveRelease(store, channel, platform) {
  const channelState = store.channels?.[channel]?.[platform];
  if (!channelState?.activeReleaseId) return null;
  return findRelease(store, channelState.activeReleaseId);
}

function resolvePublicApiBaseForMobileDownload() {
  const baseOverride = process.env.MOBILE_ANDROID_DOWNLOAD_BASE_URL?.trim();
  if (baseOverride) return baseOverride.replace(/\/$/, '');

  const publicApi = process.env.PUBLIC_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!publicApi) return null;

  let parsed;
  try {
    parsed = new URL(publicApi);
  } catch {
    return publicApi.replace(/\/$/, '');
  }

  const host = parsed.hostname.toLowerCase();
  const isDevLocalHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');

  if (!isDevLocalHost) return publicApi.replace(/\/$/, '');

  const lanHost =
    process.env.MOBILE_DEV_LAN_HOST?.trim()
    || process.env.DEV_HTTPS_LAN_IP?.trim()
    || (process.env.HOST_IP?.trim() && process.env.HOST_IP.trim() !== 'localhost'
      ? process.env.HOST_IP.trim()
      : '');

  if (lanHost) {
    const gatewayPort = process.env.API_GATEWAY_PORT?.trim() || '5002';
    return `http://${lanHost}:${gatewayPort}`;
  }

  return publicApi.replace(/\/$/, '');
}

function isDevLocalDownloadHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

function effectiveAndroidDownloadUrl(release) {
  const fullOverride = process.env.MOBILE_ANDROID_DOWNLOAD_URL?.trim();
  if (fullOverride) return fullOverride;
  if (release.downloadUrl && !isDevLocalDownloadHost(release.downloadUrl)) {
    return release.downloadUrl;
  }
  if (release.filename) return buildDownloadUrlForFilename(release.filename);
  return release.downloadUrl || null;
}

function isDevPublicApiUrl() {
  const publicApi = process.env.PUBLIC_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!publicApi) return false;
  try {
    const host = new URL(publicApi).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
  } catch {
    return false;
  }
}

function buildDownloadUrlForFilename(filename) {
  const fullOverride = process.env.MOBILE_ANDROID_DOWNLOAD_URL?.trim();
  if (fullOverride) return fullOverride;

  const baseOverride = process.env.MOBILE_ANDROID_DOWNLOAD_BASE_URL?.trim();
  if (baseOverride && filename) {
    return `${baseOverride.replace(/\/$/, '')}/api/v1/mobile/releases/download/${encodeURIComponent(filename)}`;
  }

  // Dev local : chemin relatif — l'app mobile le résout via ApiService.baseUrl (adb reverse / LAN).
  if (isDevPublicApiUrl() && filename) {
    return `/api/v1/mobile/releases/download/${encodeURIComponent(filename)}`;
  }

  const publicApi = resolvePublicApiBaseForMobileDownload();
  if (!filename || !publicApi) return null;
  return `${publicApi}/api/v1/mobile/releases/download/${encodeURIComponent(filename)}`;
}

function releaseToPublicInfo(release, channelState) {
  if (!release) return null;
  const base = {
    platform: release.platform,
    channel: release.channel,
    version: release.version,
    buildNumber: release.buildNumber,
    minVersion: channelState?.minVersion || '0.0.0',
    minBuild: channelState?.minBuild ?? 0,
    forceUpdate: channelState?.forceUpdate === true,
    releaseNotes: release.releaseNotes || '',
    releaseId: release.id,
    publishedAt: release.createdAt,
  };

  if (release.platform === 'ios') {
    const storeUrl = release.storeUrl || process.env.MOBILE_IOS_APP_STORE_URL?.trim() || null;
    return { ...base, storeUrl, downloadUrl: storeUrl };
  }

  return {
    ...base,
    downloadUrl: effectiveAndroidDownloadUrl(release),
  };
}

function getDeployHints(store) {
  const androidReleases = store.releases.filter((r) => r.platform === 'android');
  const latest = androidReleases[0] || null;
  const activeDev = getActiveRelease(store, 'dev', 'android');
  const versionSource = activeDev || latest;
  const latestBuild = androidReleases.reduce(
    (max, r) => Math.max(max, r.buildNumber || 0),
    0,
  );

  return {
    publicApiUrl:
      process.env.PUBLIC_API_URL?.trim()
      || process.env.NEXT_PUBLIC_API_URL?.trim()
      || null,
    mobileDownloadBaseUrl: resolvePublicApiBaseForMobileDownload(),
    suggestedVersion: versionSource?.version || '1.0.0',
    suggestedBuild: Math.max(latestBuild + 1, (versionSource?.buildNumber || 0) + 1, 1),
    latestAndroidRelease: latest,
  };
}

function listAdminState() {
  const store = readStore();
  const channels = {};
  for (const channel of DEFAULT_CHANNELS) {
    channels[channel] = {};
    for (const platform of DEFAULT_PLATFORMS) {
      const channelState = store.channels[channel][platform];
      channels[channel][platform] = {
        ...channelState,
        activeRelease: getActiveRelease(store, channel, platform),
      };
    }
  }
  return {
    releasesDir: releasesDir(),
    deployHints: getDeployHints(store),
    channels,
    releases: [...store.releases].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  };
}

function createRelease({
  channel,
  platform,
  version,
  buildNumber,
  releaseNotes,
  filename,
  createdBy,
  storeUrl,
}) {
  const store = readStore();
  const release = {
    id: newReleaseId(),
    channel,
    platform,
    version: String(version),
    buildNumber: parseInt(String(buildNumber), 10) || 1,
    releaseNotes: releaseNotes || '',
    filename: filename || null,
    storeUrl: storeUrl || null,
    downloadUrl: platform === 'android' && filename ? buildDownloadUrlForFilename(filename) : null,
    createdAt: new Date().toISOString(),
    createdBy: createdBy || null,
    status: 'active',
  };

  for (const existing of store.releases) {
    if (
      existing.channel === channel
      && existing.platform === platform
      && existing.status === 'active'
    ) {
      existing.status = 'superseded';
    }
  }

  store.releases.unshift(release);
  store.channels[channel][platform].activeReleaseId = release.id;
  writeStore(store);
  return release;
}

function activateRelease(releaseId, channel, platform) {
  const store = readStore();
  const release = findRelease(store, releaseId);
  if (!release) return null;
  if (release.platform !== platform) return null;

  for (const existing of store.releases) {
    if (
      existing.channel === channel
      && existing.platform === platform
      && existing.status === 'active'
    ) {
      existing.status = 'superseded';
    }
  }

  release.channel = channel;
  release.status = 'active';
  store.channels[channel][platform].activeReleaseId = release.id;
  writeStore(store);
  return release;
}

function promoteRelease({ platform, fromChannel = 'dev', toChannel = 'production', promotedBy }) {
  const store = readStore();
  const source = getActiveRelease(store, fromChannel, platform);
  if (!source) return null;

  for (const existing of store.releases) {
    if (
      existing.channel === toChannel
      && existing.platform === platform
      && existing.status === 'active'
    ) {
      existing.status = 'superseded';
    }
  }

  source.status = 'promoted';

  const promoted = {
    id: newReleaseId(),
    channel: toChannel,
    platform,
    version: source.version,
    buildNumber: source.buildNumber,
    releaseNotes: source.releaseNotes,
    filename: source.filename,
    storeUrl: source.storeUrl,
    downloadUrl:
      source.filename
        ? buildDownloadUrlForFilename(source.filename)
        : effectiveAndroidDownloadUrl(source),
    createdAt: new Date().toISOString(),
    createdBy: promotedBy || `promote:${fromChannel}->${toChannel}`,
    status: 'active',
  };

  store.releases.unshift(promoted);
  store.channels[toChannel][platform].activeReleaseId = promoted.id;
  writeStore(store);
  return promoted;
}

function updateChannelPolicy(channel, platform, patch) {
  const store = readStore();
  const current = store.channels[channel]?.[platform];
  if (!current) return null;

  if (patch.minVersion !== undefined) current.minVersion = String(patch.minVersion);
  if (patch.minBuild !== undefined) current.minBuild = parseInt(String(patch.minBuild), 10) || 0;
  if (patch.forceUpdate !== undefined) current.forceUpdate = patch.forceUpdate === true;
  writeStore(store);
  return current;
}

function getPublicReleaseInfo(platformRaw, channelRaw) {
  const platform = String(platformRaw || 'android').toLowerCase();
  const channel = String(channelRaw || 'production').toLowerCase();
  const store = readStore();
  const channelState = store.channels?.[channel]?.[platform];
  const active = getActiveRelease(store, channel, platform);
  if (active) {
    return releaseToPublicInfo(active, channelState);
  }

  if (channel !== 'production') {
    return null;
  }

  // Fallback env Portainer (production seulement)
  const { getMobileReleaseInfoFromEnv } = require('../lib/mobileReleaseConfigEnv');
  const envInfo = getMobileReleaseInfoFromEnv(platform);
  if (!envInfo) return null;
  return {
    ...envInfo,
    channel: 'production',
    minVersion: channelState?.minVersion || envInfo.minVersion,
    minBuild: channelState?.minBuild ?? envInfo.minBuild,
    forceUpdate: channelState?.forceUpdate === true || envInfo.forceUpdate,
  };
}

module.exports = {
  releasesDir,
  readStore,
  listAdminState,
  createRelease,
  activateRelease,
  promoteRelease,
  updateChannelPolicy,
  getPublicReleaseInfo,
  buildDownloadUrlForFilename,
  resolvePublicApiBaseForMobileDownload,
};
