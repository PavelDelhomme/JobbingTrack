const fs = require('fs');
const path = require('path');

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
    const match = yaml.match(/^version:\s*([0-9.]+)\+(\d+)/m);
    if (!match) return null;
    return {
      version: match[1],
      buildNumber: parseInt(match[2], 10) || 1,
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
