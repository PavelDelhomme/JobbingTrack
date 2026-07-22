const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatJobbingTrackVersion,
  normalizeLegacyVersion,
  normalizeVersionWithBuild,
  computeSuggestedVersion,
  bumpPubspecForNextBuild,
  alignLegacyPubspec,
  computeMobileSourceFingerprint,
  writeStoredSourceFingerprint,
  shouldBumpVersionForBuild,
} = require('./mobile-version-policy.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('formatJobbingTrackVersion aligne patch sur build', () => {
  assert.equal(formatJobbingTrackVersion(1, 0, 12), '1.0.12');
});

test('normalizeLegacyVersion convertit 1.0.0+12', () => {
  assert.equal(normalizeLegacyVersion('1.0.0', 12), '1.0.12');
});

test('normalizeVersionWithBuild force le 3e segment', () => {
  assert.equal(normalizeVersionWithBuild('1.0.0', 5), '1.0.5');
});

test('computeSuggestedVersion propose 1.0.8 après release build 7', () => {
  const releases = [{ version: '1.0.0', buildNumber: 7 }];
  const { suggestedVersion, suggestedBuild } = computeSuggestedVersion(releases, releases[0], null);
  assert.equal(suggestedBuild, 8);
  assert.equal(suggestedVersion, '1.0.8');
});

test('bumpPubspecForNextBuild incrémente version et build', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-pubspec-'));
  const file = path.join(dir, 'pubspec.yaml');
  fs.writeFileSync(file, 'name: t\nversion: 1.0.12+12\n', 'utf8');
  const next = bumpPubspecForNextBuild(file);
  assert.equal(next.version, '1.0.13');
  assert.equal(next.buildNumber, 13);
  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /version: 1\.0\.13\+13/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('alignLegacyPubspec migre 1.0.0+12 vers 1.0.12+12', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-pubspec-'));
  const file = path.join(dir, 'pubspec.yaml');
  fs.writeFileSync(file, 'name: t\nversion: 1.0.0+12\n', 'utf8');
  const aligned = alignLegacyPubspec(file);
  assert.equal(aligned.version, '1.0.12');
  assert.equal(aligned.buildNumber, 12);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('shouldBumpVersionForBuild : inchangé si empreinte égale', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-fp-'));
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: t\nversion: 1.0.29+29\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'lib', 'a.dart'), 'void main() {}\n', 'utf8');
  const fp = computeMobileSourceFingerprint(dir);
  writeStoredSourceFingerprint(dir, fp);
  const decision = shouldBumpVersionForBuild(dir);
  assert.equal(decision.bump, false);
  assert.equal(decision.reason, 'unchanged');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('shouldBumpVersionForBuild : bump si sources changées', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-fp-'));
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: t\nversion: 1.0.29+29\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'lib', 'a.dart'), 'void main() {}\n', 'utf8');
  writeStoredSourceFingerprint(dir, computeMobileSourceFingerprint(dir));
  fs.writeFileSync(path.join(dir, 'lib', 'a.dart'), 'void main() { /* change */ }\n', 'utf8');
  const decision = shouldBumpVersionForBuild(dir);
  assert.equal(decision.bump, true);
  assert.equal(decision.reason, 'sources-changed');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('shouldBumpVersionForBuild : force ignore empreinte', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-fp-'));
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pubspec.yaml'), 'name: t\nversion: 1.0.29+29\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'lib', 'a.dart'), 'void main() {}\n', 'utf8');
  writeStoredSourceFingerprint(dir, computeMobileSourceFingerprint(dir));
  const decision = shouldBumpVersionForBuild(dir, { force: true });
  assert.equal(decision.bump, true);
  assert.equal(decision.reason, 'force');
  fs.rmSync(dir, { recursive: true, force: true });
});
