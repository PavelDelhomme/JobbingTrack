const Redis = require('ioredis');
const logger = require('../utils/logger');

// Configuration Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Gestionnaire d'erreurs Redis
redis.on('error', (err) => {
  logger.error('Erreur de connexion Redis:', err);
});

redis.on('connect', () => {
  logger.info('Connecté à Redis pour le rate limiting');
});

// Configuration du rate limiting
const RATE_LIMITS = {
  // Limite générale par IP
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requêtes par minute
    keyGenerator: (req) => `rate_limit:general:${req.ip}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Limite stricte pour les endpoints sensibles
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 tentatives par minute
    keyGenerator: (req) => `rate_limit:auth:${req.ip}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Limite pour les endpoints d'administration
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requêtes par minute
    keyGenerator: (req) => `rate_limit:admin:${req.ip}:${req.user?.id || 'anonymous'}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Limite pour les opérations de données massives
  bulk: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 opérations massives par minute
    keyGenerator: (req) => `rate_limit:bulk:${req.ip}`,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

// Middleware de rate limiting principal
const rateLimiter = (config = RATE_LIMITS.general) => {
  return async (req, res, next) => {
    try {
      const key = config.keyGenerator(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Connexion Redis si nécessaire
      if (!redis.status || redis.status !== 'ready') {
        await redis.connect();
      }

      // Récupération des timestamps des requêtes précédentes
      const requests = await redis.zrangebyscore(key, windowStart, now, 'WITHSCORES');

      // Vérification de la limite
      if (requests.length >= config.maxRequests * 2) { // *2 car chaque requête a un score et une valeur
        const resetTime = Math.ceil((windowStart + config.windowMs - now) / 1000);

        // Log de l'incident de sécurité
        logger.warn('Rate limit dépassé', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          limit: config.maxRequests,
          resetIn: resetTime
        });

        // Enregistrer l'incident dans Redis pour monitoring
        await redis.incr('rate_limit_hits');
        await redis.expire('rate_limit_hits', 3600); // Expire dans 1h

        return res.status(429).json({
          success: false,
          error: 'Trop de requêtes',
          retryAfter: resetTime,
          message: `Limite de ${config.maxRequests} requêtes par minute atteinte. Réessayez dans ${resetTime} secondes.`
        });
      }

      // Ajout de la requête actuelle
      await redis.zadd(key, now, `${now}:${Math.random()}`);

      // Nettoyage des anciennes entrées
      await redis.zremrangebyscore(key, 0, windowStart);

      // Définition de l'expiration de la clé
      await redis.expire(key, Math.ceil(config.windowMs / 1000));

      // Ajout des headers de rate limiting
      const remaining = Math.max(0, config.maxRequests - Math.floor(requests.length / 2));
      res.set({
        'X-RateLimit-Limit': config.maxRequests,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': new Date(windowStart + config.windowMs).toISOString()
      });

      next();
    } catch (error) {
      logger.error('Erreur rate limiter:', error);

      // En cas d'erreur Redis, continuer sans rate limiting (fail open)
      next();
    }
  };
};

// Middleware spécialisé pour les endpoints d'authentification
const authRateLimiter = rateLimiter(RATE_LIMITS.auth);

// Middleware pour les endpoints d'administration
const adminRateLimiter = rateLimiter(RATE_LIMITS.admin);

// Middleware pour les opérations massives
const bulkRateLimiter = rateLimiter(RATE_LIMITS.bulk);

// Fonction pour nettoyer manuellement les compteurs de rate limiting
const cleanupRateLimitKeys = async (pattern = 'rate_limit:*') => {
  try {
    if (!redis.status || redis.status !== 'ready') {
      await redis.connect();
    }

    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Nettoyé ${keys.length} clés de rate limiting`);
    }

    return keys.length;
  } catch (error) {
    logger.error('Erreur nettoyage rate limit keys:', error);
    return 0;
  }
};

// Fonction pour obtenir les statistiques de rate limiting
const getRateLimitStats = async () => {
  try {
    if (!redis.status || redis.status !== 'ready') {
      await redis.connect();
    }

    const hits = await redis.get('rate_limit_hits') || '0';
    const keys = await redis.keys('rate_limit:*');

    return {
      totalHits: parseInt(hits),
      activeKeys: keys.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Erreur récupération stats rate limit:', error);
    return {
      totalHits: 0,
      activeKeys: 0,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  rateLimiter,
  authRateLimiter,
  adminRateLimiter,
  bulkRateLimiter,
  cleanupRateLimitKeys,
  getRateLimitStats,
  RATE_LIMITS,
  redis
};
