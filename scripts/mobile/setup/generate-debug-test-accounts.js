#!/usr/bin/env node
/**
 * Génère les comptes test debug mobile depuis `.env` racine (APK debug uniquement).
 *
 *   node scripts/mobile/setup/generate-debug-test-accounts.js
 *
 * @used-by scripts/mobile/setup/build-apk-debug.sh, mobile/lib/screens/jobbing/auth/login_screen.dart
 */

const fs = require('fs');
const path = require('path');
const { loadRootEnv } = require('../lib/resolve-admin-credentials');

const OUT = path.resolve(__dirname, '../../../mobile/lib/config/debug_test_accounts.generated.dart');

function dartString(value) {
  return JSON.stringify(String(value || '').trim());
}

function main() {
  loadRootEnv();
  const userEmail = process.env.TEST_USER_EMAIL?.trim() || '';
  const userPassword = process.env.TEST_USER_PASSWORD?.trim() || '';
  const adminEmail = process.env.TEST_ADMIN_EMAIL?.trim() || '';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD?.trim() || '';

  const content = `// GENERATED — ne pas éditer. Source: .env via generate-debug-test-accounts.js
// ignore_for_file: constant_identifier_names

class DebugTestAccounts {
  DebugTestAccounts._();

  static const String userEmail = ${dartString(userEmail)};
  static const String userPassword = ${dartString(userPassword)};
  static const String adminEmail = ${dartString(adminEmail)};
  static const String adminPassword = ${dartString(adminPassword)};

  static bool get isConfigured =>
      userEmail.isNotEmpty &&
      userPassword.isNotEmpty &&
      adminEmail.isNotEmpty &&
      adminPassword.isNotEmpty &&
      !userEmail.contains('example.invalid') &&
      !adminEmail.contains('example.invalid');
}
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, content, 'utf8');
  console.log(`[generate-debug-test-accounts] OK → ${path.relative(process.cwd(), OUT)}`);
  console.log(`  USER  : ${userEmail ? userEmail.replace(/(.{3}).+(@.+)/, '$1***$2') : '(absent)'}`);
  console.log(`  ADMIN : ${adminEmail ? adminEmail.replace(/(.{3}).+(@.+)/, '$1***$2') : '(absent)'}`);
}

main();
