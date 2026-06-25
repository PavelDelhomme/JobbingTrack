/**
 * Résout des identifiants utilisateur test valides pour les smokes mobile ADB.
 * Utilise TEST_USER_EMAIL / TEST_USER_PASSWORD via POST /api/v1/auth/login.
 */

const { loadRootEnv, probeLogin, GATEWAY_URL } = require('../lib/resolve-admin-credentials');

function listUserCredentialCandidates() {
  loadRootEnv();
  return [
    {
      source: 'TEST_USER_*',
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    },
  ].filter((c) => c.email && c.password);
}

async function resolveWorkingUserCredentials() {
  const candidates = listUserCredentialCandidates();
  if (candidates.length === 0) {
    throw new Error('TEST_USER_EMAIL et TEST_USER_PASSWORD requis dans .env');
  }
  for (const candidate of candidates) {
    if (await probeLogin(candidate.email, candidate.password)) {
      return candidate;
    }
  }
  throw new Error(
    'Login gateway KO pour TEST_USER_*. Vérifiez .env, seed auth et stack (port 5002).',
  );
}

module.exports = {
  listUserCredentialCandidates,
  resolveWorkingUserCredentials,
  GATEWAY_URL,
};
