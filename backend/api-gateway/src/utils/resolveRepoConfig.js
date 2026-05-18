'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Charge un fichier sous `config/` à la racine du monorepo (dev hôte)
 * ou sous `/app/config` quand `./config` est monté dans le conteneur Docker.
 *
 * @param {string} name — ex. `dev-test-bypass-format.cjs`, `jt-env-policy.cjs`
 */
function requireRepoConfigFile(name) {
  const dockerPath = path.join(__dirname, '..', '..', 'config', name);
  if (fs.existsSync(dockerPath)) {
    return require(dockerPath);
  }
  const monorepoPath = path.join(__dirname, '..', '..', '..', '..', 'config', name);
  if (fs.existsSync(monorepoPath)) {
    return require(monorepoPath);
  }
  throw new Error(
    `config/${name} introuvable. Docker dev : monter \`- ./config:/app/config:ro\` sur api-gateway. ` +
      `Chemins essayés : ${dockerPath} ; ${monorepoPath}`,
  );
}

module.exports = { requireRepoConfigFile };
