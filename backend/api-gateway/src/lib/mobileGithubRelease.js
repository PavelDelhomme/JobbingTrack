const https = require('https');
const { githubTagForRelease } = require('./mobilePubspec');

function isEnabled() {
  return process.env.MOBILE_GITHUB_RELEASES_ENABLED === 'true';
}

function resolveRepo() {
  const fromEnv = process.env.GITHUB_REPOSITORY?.trim() || process.env.MOBILE_GITHUB_REPOSITORY?.trim();
  if (fromEnv && fromEnv.includes('/')) return fromEnv;
  return null;
}

function resolveToken() {
  return process.env.MOBILE_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || null;
}

function githubRequest(method, apiPath, token, body) {
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'jobbingtrack-api-gateway',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
        timeout: 20000,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = raw;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            // keep raw string
          }
          resolve({ status: res.statusCode || 0, data });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('GitHub API timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Crée une GitHub Release (métadonnées + notes) sans upload APK (trop volumineux en local).
 * L’APK reste servi via OTA ; le workflow CI peut attacher l’artefact sur tag `mobile-v*`.
 */
async function createGitHubReleaseForMobile(release, { downloadUrl } = {}) {
  if (!isEnabled()) return null;

  const token = resolveToken();
  const repo = resolveRepo();
  if (!token || !repo) return null;

  const tag = githubTagForRelease(release.version, release.buildNumber);
  const name = `JobbingTrack Android ${release.version}+${release.buildNumber}`;
  const bodyLines = [
    release.releaseNotes || 'Mise à jour JobbingTrack (canal OTA).',
    '',
    `Canal : **${release.channel}**`,
    `Build : **${release.buildNumber}**`,
  ];
  if (downloadUrl) {
    bodyLines.push('', `Téléchargement OTA : ${downloadUrl}`);
  }
  if (release.filename) {
    bodyLines.push('', `Package : \`${release.filename}\``);
  }

  const createRes = await githubRequest(
    'POST',
    `/repos/${repo}/releases`,
    token,
    {
      tag_name: tag,
      name,
      body: bodyLines.join('\n'),
      draft: false,
      prerelease: release.channel !== 'production',
      generate_release_notes: false,
    },
  );

  if (createRes.status === 201 && createRes.data?.html_url) {
    return {
      githubTag: tag,
      githubReleaseUrl: createRes.data.html_url,
    };
  }

  if (createRes.status === 422) {
    const listRes = await githubRequest('GET', `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, token);
    if (listRes.status === 200 && listRes.data?.html_url) {
      return {
        githubTag: tag,
        githubReleaseUrl: listRes.data.html_url,
        existing: true,
      };
    }
  }

  const message = typeof createRes.data === 'object'
    ? createRes.data?.message || JSON.stringify(createRes.data)
    : String(createRes.data || createRes.status);
  throw new Error(`GitHub Release échouée (${createRes.status}) : ${message}`);
}

module.exports = {
  createGitHubReleaseForMobile,
  isEnabled,
  resolveRepo,
};
