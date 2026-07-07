/**
 * Politique de version JobbingTrack — voir docs/mobile/VERSIONNEMENT.md
 *
 * Règle produit : version affichée MAJOR.MINOR.BUILD (ex. 1.0.12) + numéro de build Android (+12).
 * Le 3e segment semver = numéro de build (évolution visible en dev).
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

/** Version JobbingTrack : le patch affiché = numéro de build. */
function formatJobbingTrackVersion(major, minor, buildNumber) {
  const b = Math.max(1, parseInt(String(buildNumber), 10) || 1);
  return `${major}.${minor}.${b}`;
}

function normalizeVersionWithBuild(version, buildNumber) {
  const { major, minor } = parseSemver(version);
  return formatJobbingTrackVersion(major, minor, buildNumber);
}

/** Ancien format dev : 1.0.0+12 → affichage 1.0.12 */
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

function writePubspecVersion(filePath, version, buildNumber) {
  const yaml = fs.readFileSync(filePath, 'utf8');
  const normalized = normalizeVersionWithBuild(version, buildNumber);
  const next = `${normalized}+${buildNumber}`;
  if (!/^version:\s/m.test(yaml)) {
    throw new Error('Champ version: introuvable dans pubspec.yaml');
  }
  const updated = yaml.replace(/^version:\s*.+$/m, `version: ${next}`);
  fs.writeFileSync(filePath, updated, 'utf8');
  return { version: normalized, buildNumber, pubspecLine: next };
}

/**
 * Aligne un ancien pubspec 1.0.0+N vers 1.0.N+N (sans incrémenter).
 */
function alignLegacyPubspec(filePath) {
  const current = readPubspecVersion(filePath);
  if (!current) return null;
  const { major, minor, patch, buildNumber } = current;
  if (patch === 0 && buildNumber > 0 && major === 1 && minor === 0) {
    return writePubspecVersion(filePath, formatJobbingTrackVersion(major, minor, buildNumber), buildNumber);
  }
  const normalized = normalizeVersionWithBuild(current.version, buildNumber);
  if (normalized !== current.version) {
    return writePubspecVersion(filePath, normalized, buildNumber);
  }
  return { version: current.version, buildNumber, pubspecLine: `${current.version}+${buildNumber}` };
}

/**
 * Incrémente build + patch (3e segment) pour le prochain APK.
 * @param {object} [opts]
 * @param {number} [opts.minBuild] — ne pas descendre sous ce build (release OTA active)
 */
function bumpPubspecForNextBuild(filePath, opts = {}) {
  alignLegacyPubspec(filePath);
  const current = readPubspecVersion(filePath);
  if (!current) throw new Error(`pubspec introuvable : ${filePath}`);

  const minBuild = opts.minBuild != null ? parseInt(String(opts.minBuild), 10) : 0;
  const nextBuild = Math.max(current.buildNumber + 1, minBuild, 1);
  const nextVersion = formatJobbingTrackVersion(current.major, current.minor, nextBuild);
  return writePubspecVersion(filePath, nextVersion, nextBuild);
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
  writePubspecVersion,
  alignLegacyPubspec,
  bumpPubspecForNextBuild,
  computeSuggestedVersion,
};
