/**
 * Identifiants pour reset / seed porteur (admin ou user test).
 */

const {
  loadRootEnv,
  probeLogin,
  resolveWorkingAdminCredentials,
  GATEWAY_URL,
} = require('./resolve-admin-credentials');
const { resolveWorkingUserCredentials } = require('./resolve-user-credentials');

async function resolveCredentialsForAccount(account = 'admin') {
  loadRootEnv();

  if (account === 'admin' || account === 'porteur') {
    return resolveWorkingAdminCredentials();
  }
  if (account === 'user') {
    return resolveWorkingUserCredentials();
  }

  const email = String(account).trim();
  const passwordCandidates = [
    process.env.PORTEUR_RESET_PASSWORD,
    process.env.ADMIN_PASSWORD,
    process.env.TEST_ADMIN_PASSWORD,
    process.env.TEST_USER_PASSWORD,
  ].filter(Boolean);

  for (const password of passwordCandidates) {
    if (await probeLogin(email, password)) {
      return { source: 'PORTEUR_RESET_EMAIL', email, password };
    }
  }

  throw new Error(
    `Login KO pour ${email}. Définir PORTEUR_RESET_PASSWORD ou ADMIN_PASSWORD dans .env`,
  );
}

module.exports = {
  resolveCredentialsForAccount,
  GATEWAY_URL,
};
