const {
  listAdminState,
  createRelease,
  publishBuiltApk,
  activateRelease,
  promoteRelease,
  updateChannelPolicy,
  attachGithubReleaseMetadata,
} = require('../services/mobileReleaseStore');
const { createGitHubReleaseForMobile } = require('../lib/mobileGithubRelease');

async function maybeAttachGithubRelease(release) {
  try {
    const downloadUrl = release.downloadUrl || null;
    const gh = await createGitHubReleaseForMobile(release, { downloadUrl });
    if (!gh) return release;
    return attachGithubReleaseMetadata(release.id, gh) || release;
  } catch (error) {
    console.warn('[mobile-releases] GitHub Release ignorée:', error.message);
    return release;
  }
}

exports.listReleases = (_req, res) => {
  try {
    return res.json({ success: true, data: listAdminState() });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.publishBuiltRelease = async (req, res) => {
  try {
    const channel = String(req.body.channel || 'dev').toLowerCase();
    const version = req.body.version;
    const buildNumber = req.body.buildNumber;

    if (!['dev', 'preprod', 'production'].includes(channel)) {
      return res.status(400).json({ success: false, error: 'channel invalide (dev | preprod | production)' });
    }

    let release = publishBuiltApk({
      channel,
      version,
      buildNumber,
      releaseNotes: req.body.releaseNotes || '',
      createdBy: req.user?.email || null,
    });

    release = await maybeAttachGithubRelease(release);

    return res.status(201).json({ success: true, release });
  } catch (error) {
    const status = error.message.includes('introuvable') || error.message.includes('requis')
      ? 400
      : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};

exports.uploadRelease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fichier APK requis' });
    }

    const channel = String(req.body.channel || 'dev').toLowerCase();
    const platform = String(req.body.platform || 'android').toLowerCase();
    const version = req.body.version;
    const buildNumber = req.body.buildNumber;

    if (!version || !buildNumber) {
      return res.status(400).json({ success: false, error: 'version et buildNumber requis' });
    }
    if (!['dev', 'preprod', 'production'].includes(channel)) {
      return res.status(400).json({ success: false, error: 'channel invalide (dev | preprod | production)' });
    }
    if (platform !== 'android') {
      return res.status(400).json({ success: false, error: 'Seul android supporte l’upload APK pour l’instant' });
    }

    let release = createRelease({
      channel,
      platform,
      version,
      buildNumber,
      releaseNotes: req.body.releaseNotes || '',
      filename: req.file.filename,
      createdBy: req.user?.email || null,
    });

    release = await maybeAttachGithubRelease(release);

    return res.status(201).json({ success: true, release });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.promoteToProduction = async (req, res) => {
  try {
    const platform = String(req.body.platform || 'android').toLowerCase();
    const fromChannel = String(req.body.fromChannel || 'dev').toLowerCase();
    const toChannel = String(req.body.toChannel || 'production').toLowerCase();

    let promoted = promoteRelease({
      platform,
      fromChannel,
      toChannel,
      promotedBy: req.user?.email || null,
    });

    if (!promoted) {
      return res.status(404).json({
        success: false,
        error: `Aucune release active sur ${fromChannel}/${platform}`,
      });
    }

    promoted = await maybeAttachGithubRelease(promoted);

    return res.json({ success: true, release: promoted });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.patchChannelPolicy = (req, res) => {
  try {
    const channel = String(req.params.channel || '').toLowerCase();
    const platform = String(req.params.platform || 'android').toLowerCase();
    const updated = updateChannelPolicy(channel, platform, {
      minVersion: req.body.minVersion,
      minBuild: req.body.minBuild,
      forceUpdate: req.body.forceUpdate,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Canal ou plateforme introuvable' });
    }

    return res.json({ success: true, policy: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.activateExistingRelease = (req, res) => {
  try {
    const channel = String(req.body.channel || 'dev').toLowerCase();
    const platform = String(req.body.platform || 'android').toLowerCase();
    const release = activateRelease(req.params.id, channel, platform);

    if (!release) {
      return res.status(404).json({ success: false, error: 'Release introuvable' });
    }

    return res.json({ success: true, release });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.registerIosRelease = (req, res) => {
  try {
    const channel = String(req.body.channel || 'dev').toLowerCase();
    const { version, buildNumber, storeUrl, releaseNotes } = req.body;
    if (!version || !buildNumber || !storeUrl) {
      return res.status(400).json({
        success: false,
        error: 'version, buildNumber et storeUrl requis pour iOS',
      });
    }

    const release = createRelease({
      channel,
      platform: 'ios',
      version,
      buildNumber,
      storeUrl,
      releaseNotes: releaseNotes || '',
      createdBy: req.user?.email || null,
    });

    return res.status(201).json({ success: true, release });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
