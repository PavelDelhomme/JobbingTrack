/**
 * Vérifications strictes au boot de la gateway (secrets / chaîne critique).
 * Voir `config/jt-env-policy.cjs` et `docs/configuration/STRICT_ENV.md`.
 */
const path = require('path');
const policy = require(path.join(__dirname, '../../../../config/jt-env-policy.cjs'));

function assertGatewayEnvOrThrow() {
  if (policy.isStrictEnvSkipped()) return;

  policy.requireEnv('DATABASE_URL');
  policy.requireEnv('JWT_SECRET');
  policy.requireEnv('JWT_REFRESH_SECRET');
  policy.requireEnv('SECURITY_INTERNAL_SECRET');
  policy.requireEnv('REDIS_URL');
  policy.requireEnv('PORT');
  policy.requireEnv('TRUST_PROXY_HOPS');
  policy.requireEnv('SECURITY_SERVICE_URL');
}

module.exports = { assertGatewayEnvOrThrow };
