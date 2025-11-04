/**
 * Service de cache granulaire
 * Cache intelligent pour optimiser les performances
 */

const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        const Redis = require('ioredis');
        this.redisClient = new Redis(process.env.REDIS_URL);

        this.redisClient.on('connect', () => {
          logger.info('✅ Cache Redis connecté');
        });

        this.redisClient.on('error', (error) => {
          logger.warn('⚠️ Erreur Redis cache:', error.message);
        });
      }
    } catch (error) {
      logger.warn('⚠️ Redis non disponible pour le cache');
    }
  }

  /**
   * Génère une clé de cache unique
   */
  generateKey(prefix, params) {
    const key = `${prefix}:${JSON.stringify(params)}`;
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Récupère une valeur du cache
   */
  async get(key, fallback = null) {
    try {
      // Essayer Redis d'abord
      if (this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          logger.debug(`📦 Cache hit Redis: ${key}`);
          return JSON.parse(redisValue);
        }
      }

      // Fallback vers cache mémoire
      if (this.cache.has(key)) {
        const value = this.cache.get(key);
        if (Date.now() < value.expiry) {
          logger.debug(`📦 Cache hit memory: ${key}`);
          return value.data;
        } else {
          // Expiré, supprimer
          this.cache.delete(key);
        }
      }

      // Pas en cache, utiliser fallback
      if (fallback) {
        logger.debug(`💾 Cache miss: ${key}`);
        return await fallback();
      }

      return null;
    } catch (error) {
      logger.error('Erreur récupération cache:', error);
      return fallback ? await fallback() : null;
    }
  }

  /**
   * Met une valeur en cache
   */
  async set(key, value, ttlMinutes = 5) {
    try {
      const expiry = Date.now() + (ttlMinutes * 60 * 1000);
      const cacheValue = { data: value, expiry };

      // Redis
      if (this.redisClient) {
        await this.redisClient.setex(key, ttlMinutes * 60, JSON.stringify(value));
        logger.debug(`💾 Cache set Redis: ${key} (${ttlMinutes}min)`);
      }

      // Cache mémoire
      this.cache.set(key, cacheValue);
      logger.debug(`💾 Cache set memory: ${key} (${ttlMinutes}min)`);

      // Nettoyage automatique du cache mémoire
      this.scheduleCleanup();

    } catch (error) {
      logger.error('Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Supprime une valeur du cache
   */
  async delete(key) {
    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      this.cache.delete(key);
      logger.debug(`🗑️ Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Erreur suppression cache:', error);
    }
  }

  /**
   * Invalide les clés qui matchent un pattern
   */
  async invalidatePattern(pattern) {
    try {
      if (this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          logger.info(`🗑️ Cache invalidated pattern: ${pattern} (${keys.length} keys)`);
        }
      }

      // Invalider en mémoire
      for (const [key] of this.cache) {
        if (key.includes(pattern.replace('*', ''))) {
          this.cache.delete(key);
        }
      }

    } catch (error) {
      logger.error('Erreur invalidation cache pattern:', error);
    }
  }

  /**
   * Nettoie le cache expiré
   */
  scheduleCleanup() {
    // Nettoyer toutes les 10 minutes
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, value] of this.cache) {
        if (now > value.expiry) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`🧹 Cache cleanup: ${cleaned} entries removed`);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Cache pour les candidatures avec relations optimisées
   */
  async getCachedApplications(userId, options = {}) {
    const key = this.generateKey('applications', { userId, ...options });

    return await this.get(key, async () => {
      // Requête optimisée depuis le service d'optimisation
      const optimizationService = require('../application-service/src/services/optimization.service');
      return await optimizationService.optimizeApplicationQuery(userId, options);
    });
  }

  /**
   * Cache pour les contacts
   */
  async getCachedContacts(userId, options = {}) {
    const key = this.generateKey('contacts', { userId, ...options });

    return await this.get(key, async () => {
      const contactService = require('../contact-service/src/controllers/contact.controller');
      // Simulation - adapter selon l'implémentation réelle
      return await contactService.getContactsOptimized(userId, options);
    });
  }

  /**
   * Cache pour les statistiques
   */
  async getCachedStats(userId, type = 'all') {
    const key = this.generateKey('stats', { userId, type });

    return await this.get(key, async () => {
      const optimizationService = require('../application-service/src/services/optimization.service');
      return await optimizationService.getOptimizedStats(userId);
    }, 2); // Cache 2 minutes pour les stats
  }

  /**
   * Cache pour les entreprises
   */
  async getCachedCompanies(userId, options = {}) {
    const key = this.generateKey('companies', { userId, ...options });

    return await this.get(key, async () => {
      const companyService = require('../company-service/src/controllers/company.controller');
      return await companyService.getCompaniesOptimized(userId, options);
    });
  }

  /**
   * Invalide le cache d'un utilisateur
   */
  async invalidateUserCache(userId) {
    const patterns = [
      `applications:${userId}:*`,
      `contacts:${userId}:*`,
      `companies:${userId}:*`,
      `stats:${userId}:*`,
      `events:${userId}:*`,
      `interviews:${userId}:*`
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    logger.info(`🗑️ Cache invalidé pour utilisateur: ${userId}`);
  }

  /**
   * Statistiques du cache
   */
  getCacheStats() {
    const memorySize = this.cache.size;
    const redisConnected = this.redisClient && this.redisClient.status === 'ready';

    return {
      timestamp: new Date().toISOString(),
      memory: {
        entries: memorySize,
        size: 'N/A' // Calcul de taille approximative
      },
      redis: {
        connected: redisConnected,
        status: redisConnected ? 'ready' : 'disconnected'
      },
      performance: {
        hits: this.cacheHits || 0,
        misses: this.cacheMisses || 0,
        hitRate: this.cacheHits && this.cacheMisses ?
          (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(1) + '%' : 'N/A'
      }
    };
  }

  /**
   * Cache pour les templates de messages
   */
  async getCachedTemplates(userId) {
    const key = this.generateKey('templates', { userId });

    return await this.get(key, async () => {
      const templateService = require('../application-service/src/controllers/template.controller');
      return await templateService.getTemplates(userId);
    }, 10); // Cache 10 minutes pour les templates
  }

  /**
   * Cache pour les événements calendrier
   */
  async getCachedEvents(userId, dateRange = {}) {
    const key = this.generateKey('events', { userId, ...dateRange });

    return await this.get(key, async () => {
      const eventService = require('../event-service/src/controllers/event.controller');
      return await eventService.getEventsOptimized(userId, dateRange);
    }, 5); // Cache 5 minutes pour les événements
  }
}

module.exports = new CacheService();
