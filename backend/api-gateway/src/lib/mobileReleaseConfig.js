const { getPublicReleaseInfo } = require('../services/mobileReleaseStore');
const { getMobileReleaseInfoFromEnv } = require('./mobileReleaseConfigEnv');

function getMobileReleaseInfo(platformRaw, channelRaw = 'production') {
  const info = getPublicReleaseInfo(platformRaw, channelRaw);
  if (info) return info;
  return getMobileReleaseInfoFromEnv(platformRaw);
}

module.exports = { getMobileReleaseInfo, getMobileReleaseInfoFromEnv };
