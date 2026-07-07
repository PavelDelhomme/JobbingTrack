/**
 * Politique de version JobbingTrack — voir docs/mobile/VERSIONNEMENT.md
 * (Copie alignée sur scripts/mobile/lib/mobile-version-policy.cjs pour le conteneur api-gateway.)
 */
const fs = require('fs');

function parseSemver(version) {
  const raw = String(version || '1.0.0').trim();
  const parts = raw.split('.').map((p) => parseInt(p, 10) || 0);
  return {
    major: parts[0] ?? 1,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
}

function formatJobbingTrackVersion(major, minor, buildNumber) {
  const b = Math.max(1, parseInt(String(buildNumber), 10) || 1);
  return `${major}.${minor}.${b}`;
}

function normalizeVersionWithBuild(version, buildNumber) {
  const { major, minor } = parseSemver(version);
  return formatJobbingTrackVersion(major, minor, buildNumber);
}

function normalizeLegacyVersion(version, buildNumber) {
  const b = parseInt(String(buildNumber), 10) || 0;
  if (b <= 0) return String(version || '1.0.0');
  const { major, minor, patch } = parseSemver(version);
  if (major === 1 && minor === 0 && patch === 0) {
    return formatJobbingTrackVersion(major, minor, b);
  }
  return normalizeVersionWithBuild(version, b);
}

function parsePubspecLine(yaml) {
  const match = String(yaml).match(/^version:\s*([0-9.]+)\+(\d+)/m);
  if (!match) return null;
  const version = match[1];
  const buildNumber = parseInt(match[2], 10) || 1;
  const { major, minor, patch } = parseSemver(version);
  return { version, buildNumber, major, minor, patch };
}

function readPubspecVersion(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const yaml = fs.readFileSync(filePath, 'utf8');
    const parsed = parsePubspecLine(yaml);
    if (!parsed) return null;
    return { ...parsed, pubspecPath: filePath };
  } catch {
    return null;
  }
}

function computeSuggestedVersion(androidReleases, activeDev, pubspec) {
  const latestBuild = androidReleases.reduce(
    (max, r) => Math.max(max, r.buildNumber || 0),
    0,
  );
  const activeDevBuild = activeDev?.buildNumber || 0;

  const major = pubspec?.major ?? parseSemver(pubspec?.version || activeDev?.version || '1.0.0').major;
  const minor = pubspec?.minor ?? parseSemver(pubspec?.version || activeDev?.version || '1.0.0').minor;

  let suggestedBuild = Math.max(latestBuild + 1, activeDevBuild + 1, pubspec?.buildNumber || 1, 1);

  if (pubspec) {
    const alreadyPublished = androidReleases.some(
      (r) => r.buildNumber === pubspec.buildNumber
        && normalizeLegacyVersion(r.version, r.buildNumber)
          === normalizeVersionWithBuild(pubspec.version, pubspec.buildNumber),
    );
    if (alreadyPublished || pubspec.buildNumber <= activeDevBuild) {
      suggestedBuild = Math.max(suggestedBuild, pubspec.buildNumber + 1);
    } else if (pubspec.buildNumber >= suggestedBuild) {
      suggestedBuild = pubspec.buildNumber;
    }
  }

  const suggestedVersion = formatJobbingTrackVersion(major, minor, suggestedBuild);
  return { suggestedVersion, suggestedBuild, latestBuild, major, minor };
}

module.exports = {
  parseSemver,
  formatJobbingTrackVersion,
  normalizeVersionWithBuild,
  normalizeLegacyVersion,
  parsePubspecLine,
  readPubspecVersion,
  computeSuggestedVersion,
};
