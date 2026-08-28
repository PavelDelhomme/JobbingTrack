const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Config Redis gateway : REDIS_URL (Portainer) ou REDIS_HOST/PORT/PASSWORD (dev).
 */
function parseRedisConfig() {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const password =
        parsed.password !== ''
          ? decodeURIComponent(parsed.password)
          : process.env.REDIS_PASSWORD || undefined;
      return {
        host: parsed.hostname || 'redis',
        port: parseInt(parsed.port || '6379', 10),
        password,
      };
    } catch (error) {
      logger.warn('REDIS_URL invalide, fallback REDIS_HOST:', error.message);
    }
  }

  return {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

function createRedisClient(label) {
  const config = parseRedisConfig();
  const client = new Redis({
    ...config,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('connect', () => {
    logger.info(`Connecté à Redis (${label})`);
  });

  client.on('error', (err) => {
    if (String(err?.message || err).includes('NOAUTH')) {
      logger.error(
        `Redis (${label}) NOAUTH — vérifiez REDIS_URL ou REDIS_PASSWORD dans l'environnement gateway`,
        err,
      );
      return;
    }
    logger.error(`Erreur de connexion Redis (${label}):`, err);
  });

  return client;
}

module.exports = {
  createRedisClient,
  parseRedisConfig,
};
