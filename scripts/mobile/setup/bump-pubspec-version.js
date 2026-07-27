#!/usr/bin/env node
/**
 * Incrémente mobile/pubspec.yaml uniquement si le code mobile a changé
 * (ou --bump / FORCE_VERSION_BUMP=1).
 *
 * Usage :
 *   node scripts/mobile/setup/bump-pubspec-version.js
 *   node scripts/mobile/setup/bump-pubspec-version.js --bump
 *   node scripts/mobile/setup/bump-pubspec-version.js --align-only
 *   node scripts/mobile/setup/bump-pubspec-version.js --write-fingerprint-only
 */
const path = require('path');
const {
  bumpPubspecForNextBuild,
  alignLegacyPubspec,
  readPubspecVersion,
  shouldBumpVersionForBuild,
  writeStoredSourceFingerprint,
  computeMobileSourceFingerprint,
} = require('../lib/mobile-version-policy.cjs');

const ROOT = path.join(__dirname, '../../..');
const pubspecPath =
  process.env.MOBILE_PUBSPEC_PATH
  || path.join(ROOT, 'mobile/pubspec.yaml');
const mobileDir = path.dirname(pubspecPath);

const args = new Set(process.argv.slice(2));
const alignOnly = args.has('--align-only');
const forceBump = args.has('--bump') || process.env.FORCE_VERSION_BUMP === '1';
const writeFingerprintOnly = args.has('--write-fingerprint-only');

try {
  if (writeFingerprintOnly) {
    const fp = computeMobileSourceFingerprint(mobileDir);
    writeStoredSourceFingerprint(mobileDir, fp);
    const cur = readPubspecVersion(pubspecPath);
    console.log(`[bump-pubspec] empreinte enregistrée (version inchangée ${cur?.version}+${cur?.buildNumber})`);
    process.exit(0);
  }

  if (alignOnly) {
    const result = alignLegacyPubspec(pubspecPath);
    if (!result) {
      console.error('[bump-pubspec] pubspec introuvable ou illisible:', pubspecPath);
      process.exit(1);
    }
    console.log(`[bump-pubspec] aligné → ${result.pubspecLine || `${result.version}+${result.buildNumber}`}`);
    process.exit(0);
  }

  const decision = shouldBumpVersionForBuild(mobileDir, { force: forceBump });
  if (!decision.bump) {
    const cur = readPubspecVersion(pubspecPath);
    console.log(
      `[bump-pubspec] inchangé → ${cur?.version}+${cur?.buildNumber} (${decision.reason})`,
    );
    process.exit(0);
  }

  const result = bumpPubspecForNextBuild(pubspecPath);
  console.log(
    `[bump-pubspec] incrémenté → ${result.pubspecLine || `${result.version}+${result.buildNumber}`} (${decision.reason})`,
  );
} catch (e) {
  console.error('[bump-pubspec]', e.message || e);
  process.exit(1);
}
