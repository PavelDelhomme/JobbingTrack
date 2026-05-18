/**
 * Vérifications strictes au boot de l'auth-service.
 * Voir `config/jt-env-policy.cjs` et `docs/configuration/STRICT_ENV.md`.
 */
const { requireJtEnvPolicy } = require('../utils/requireJtEnvPolicy');
const policy = requireJtEnvPolicy();

function assertAuthEnvOrThrow() {
  if (policy.isStrictEnvSkipped()) return;

  policy.requireEnv('DATABASE_URL');
  policy.requireEnv('JWT_SECRET');
  policy.requireEnv('JWT_REFRESH_SECRET');
  policy.requireEnv('SECURITY_INTERNAL_SECRET');
  policy.requireEnv('REDIS_URL');
  policy.requireEnv('PORT');
  policy.requireEnv('NODE_ENV');
  policy.requireEnv('ALLOWED_ORIGINS');
  policy.requireEnv('ADMIN_EMAIL');
  policy.requireEnv('ADMIN_PASSWORD');
  policy.requireEnv('FRONTEND_URL');
  policy.requireEnv('SECURITY_SERVICE_URL');
  policy.requireEnv('APP_URL');
}

module.exports = { assertAuthEnvOrThrow };
