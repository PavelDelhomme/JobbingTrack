const fs = require('fs');
const path = require('path');
const { parsePubspecLine } = require('./mobileVersionPolicy');

function resolvePubspecPath() {
  const candidates = [
    process.env.MOBILE_PUBSPEC_PATH?.trim(),
    '/app/mobile/pubspec.yaml',
    path.join(process.cwd(), 'mobile/pubspec.yaml'),
    path.join(process.cwd(), '../mobile/pubspec.yaml'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parsePubspecVersion() {
  const file = resolvePubspecPath();
  if (!file) return null;

  try {
    const yaml = fs.readFileSync(file, 'utf8');
    const parsed = parsePubspecLine(yaml);
    if (!parsed) return null;
    return {
      version: parsed.version,
      buildNumber: parsed.buildNumber,
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      pubspecPath: file,
    };
  } catch {
    return null;
  }
}

function githubTagForRelease(version, buildNumber) {
  return `mobile-v${version}+${buildNumber}`;
}

module.exports = {
  resolvePubspecPath,
  parsePubspecVersion,
  githubTagForRelease,
};
