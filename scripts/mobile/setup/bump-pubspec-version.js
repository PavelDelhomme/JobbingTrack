#!/usr/bin/env node
/**
 * Incrémente mobile/pubspec.yaml (version 1.0.N + build N) avant un build APK.
 * Usage : node scripts/mobile/setup/bump-pubspec-version.js [--align-only]
 */
const path = require('path');
const {
  alignLegacyPubspec,
  bumpPubspecForNextBuild,
  readPubspecVersion,
} = require('../lib/mobile-version-policy.cjs');

const ROOT = path.join(__dirname, '../../..');
const pubspecPath =
  process.env.MOBILE_PUBSPEC_PATH?.trim()
  || path.join(ROOT, 'mobile/pubspec.yaml');

const alignOnly = process.argv.includes('--align-only');

try {
  const result = alignOnly
    ? alignLegacyPubspec(pubspecPath)
    : bumpPubspecForNextBuild(pubspecPath);
  if (!result) {
    console.error('[bump-pubspec] pubspec introuvable ou illisible:', pubspecPath);
    process.exit(1);
  }
  console.log(`[bump-pubspec] ${alignOnly ? 'aligné' : 'incrémenté'} → ${result.pubspecLine || `${result.version}+${result.buildNumber}`}`);
} catch (e) {
  console.error('[bump-pubspec]', e.message || e);
  process.exit(1);
}
