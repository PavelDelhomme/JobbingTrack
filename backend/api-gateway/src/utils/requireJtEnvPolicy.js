'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Charge `config/jt-env-policy.cjs` depuis la racine du monorepo (dev hôte)
 * ou depuis `/app/config` quand `./config` est monté dans le conteneur Docker.
 */
function requireJtEnvPolicy() {
  const dockerPath = path.join(__dirname, '..', '..', 'config', 'jt-env-policy.cjs');
  if (fs.existsSync(dockerPath)) {
    return require(dockerPath);
  }
  const monorepoPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'config',
    'jt-env-policy.cjs',
  );
  if (fs.existsSync(monorepoPath)) {
    return require(monorepoPath);
  }
  throw new Error(
    `jt-env-policy.cjs introuvable. Docker dev : monter la racine du dépôt avec ` +
      `\`- ./config:/app/config:ro\` sur ce service puis recréer le conteneur ` +
      `(\`docker compose up -d --force-recreate api-gateway\`). ` +
      `Chemins essayés : ${dockerPath} ; ${monorepoPath}`,
  );
}

module.exports = { requireJtEnvPolicy };
