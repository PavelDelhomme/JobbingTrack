const { PrismaClient } = require('@prisma/client');

// ✅ Initialisation conditionnelle de Prisma
let prisma = null;
let databaseEnabled = false;

try {
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
    databaseEnabled = true;
    console.log('[PERSISTENCE] ✅ Base de données connectée');
  } else {
    console.log('[PERSISTENCE] ⚠️ DATABASE_URL non définie - Persistance désactivée');
  }
} catch (error) {
  console.error('[PERSISTENCE] ❌ Erreur initialisation Prisma:', error.message);
}

/**
 * Service de persistance des métriques et logs
 * Gère l'enregistrement de toutes les données de monitoring dans la base de données
 */
class PersistenceService {
  
  /**
   * Vérifier si la base de données est disponible
   */
  isDatabaseEnabled() {
    return databaseEnabled && prisma !== null;
  }

  /**
   * Sauvegarder un snapshot de métriques système
   */
  async saveSystemMetricsSnapshot(metricsData, additionalMetrics = {}) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const snapshot = await prisma.systemMetricsSnapshot.create({
        data: {
          timestamp: new Date(),
          cpuUsagePercent: metricsData.cpu?.usage || metricsData.cpu?.percent || 0,
          cpuCores: metricsData.cpu?.cores || 1,
          cpuLoadAverage1m: metricsData.load?.average || metricsData.load?.[0] || null,
          cpuLoadAverage5m: metricsData.load?.[1] || null,
          cpuLoadAverage15m: metricsData.load?.[2] || null,
          memoryUsagePercent: metricsData.memory?.usage || metricsData.memory?.percent || 0,
          memoryUsedBytes: BigInt(metricsData.memory?.used || 0) * BigInt(1024 * 1024), // MB to Bytes
          memoryTotalBytes: BigInt(metricsData.memory?.total || 0) * BigInt(1024 * 1024),
          memoryFreeBytes: BigInt(metricsData.memory?.free || 0) * BigInt(1024 * 1024),
          diskUsagePercent: metricsData.disk?.[0]?.usage || null,
          diskUsedBytes: metricsData.disk?.[0]?.used ? BigInt(metricsData.disk[0].used) * BigInt(1024 * 1024 * 1024) : null,
          diskTotalBytes: metricsData.disk?.[0]?.total ? BigInt(metricsData.disk[0].total) * BigInt(1024 * 1024 * 1024) : null,
          diskFreeBytes: metricsData.disk?.[0]?.total && metricsData.disk?.[0]?.used 
            ? BigInt(metricsData.disk[0].total - metricsData.disk[0].used) * BigInt(1024 * 1024 * 1024) 
            : null,
          networkRxBytes: metricsData.network?.rx ? BigInt(metricsData.network.rx) : null,
          networkTxBytes: metricsData.network?.tx ? BigInt(metricsData.network.tx) : null,
          // Nouvelles métriques calculées
          availabilityPercent: additionalMetrics.availabilityPercent || null,
          loadScore: additionalMetrics.loadScore || null,
          errorCount: additionalMetrics.errorCount || null,
          errorRate: additionalMetrics.errorRate || null,
          responseTimeAvg: additionalMetrics.responseTimeAvg || null,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Snapshot système sauvegardé: ${snapshot.id} (availability: ${snapshot.availabilityPercent}%, load: ${snapshot.loadScore})`);
      return snapshot;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table SystemMetricsSnapshot non trouvée, sauvegarde ignorée (mode développement)');
          return null;
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde snapshot système:', error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder les métriques d'un conteneur
   */
  async saveContainerMetricsSnapshot(containerName, metricsData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const snapshot = await prisma.containerMetricsSnapshot.create({
        data: {
          timestamp: new Date(),
          containerName,
          containerId: metricsData.containerId || null,
          status: metricsData.status || 'running',
          cpuUsagePercent: metricsData.cpu?.percentage || null,
          cpuUsageNano: metricsData.cpu?.usage ? BigInt(metricsData.cpu.usage) : null,
          memoryUsagePercent: metricsData.memory?.percentage || null,
          memoryUsageBytes: metricsData.memory?.usage ? BigInt(metricsData.memory.usage) : null,
          memoryLimitBytes: metricsData.memory?.limit ? BigInt(metricsData.memory.limit) : null,
          networkRxBytes: metricsData.network?.rx ? BigInt(metricsData.network.rx) : null,
          networkTxBytes: metricsData.network?.tx ? BigInt(metricsData.network.tx) : null,
          blockReadBytes: metricsData.blockIO?.read ? BigInt(metricsData.blockIO.read) : null,
          blockWriteBytes: metricsData.blockIO?.write ? BigInt(metricsData.blockIO.write) : null,
          image: metricsData.image || null,
          labels: metricsData.labels || null,
        },
      });
      
      return snapshot;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[PERSISTENCE] ⚠️ Table ContainerMetricsSnapshot non trouvée, sauvegarde ignorée (mode développement)`);
          return null;
        }
      }
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde métriques ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder plusieurs métriques de conteneurs en batch
   */
  async saveMultipleContainerMetrics(containersMetrics) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const results = [];
    for (const [containerName, metrics] of Object.entries(containersMetrics)) {
      try {
        const snapshot = await this.saveContainerMetricsSnapshot(containerName, metrics);
        results.push(snapshot);
      } catch (error) {
        console.error(`[PERSISTENCE] Échec sauvegarde ${containerName}`);
      }
    }
    console.log(`[PERSISTENCE] ✅ ${results.length}/${Object.keys(containersMetrics).length} conteneurs sauvegardés`);
    return results;
  }

  /**
   * Sauvegarder les logs d'un conteneur
   */
  async saveContainerLogs(containerName, containerId, logs) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    try {
      if (!Array.isArray(logs) || logs.length === 0) {
        return [];
      }

      const savedLogs = [];
      
      for (const logEntry of logs) {
        // Parser le log pour extraire le niveau si possible
        const { level, message } = this.parseLogEntry(logEntry.log || logEntry);
        
        const saved = await prisma.containerLog.create({
          data: {
            timestamp: logEntry.timestamp ? new Date(logEntry.timestamp) : new Date(),
            containerName,
            containerId,
            stream: logEntry.stream || 'stdout',
            log: logEntry.log || logEntry,
            parsedLevel: level,
            parsedMessage: message,
          },
        });
        
        savedLogs.push(saved);
      }
      
      console.log(`[PERSISTENCE] ✅ ${savedLogs.length} logs sauvegardés pour ${containerName}`);
      return savedLogs;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[PERSISTENCE] ⚠️ Table ContainerLog non trouvée, sauvegarde ignorée (mode développement)`);
          return [];
        }
      }
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde logs ${containerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Parser une ligne de log pour extraire le niveau et le message
   */
  parseLogEntry(logLine) {
    // Patterns communs pour détecter le niveau de log
    const patterns = {
      ERROR: /\b(ERROR|error|Error|ERR)\b/,
      WARN: /\b(WARN|warn|Warning|WARNING)\b/,
      INFO: /\b(INFO|info|Info)\b/,
      DEBUG: /\b(DEBUG|debug|Debug)\b/,
      FATAL: /\b(FATAL|fatal|Fatal|CRITICAL)\b/,
    };

    for (const [level, pattern] of Object.entries(patterns)) {
      if (pattern.test(logLine)) {
        return { level, message: logLine };
      }
    }

    return { level: null, message: logLine };
  }

  /**
   * Sauvegarder l'historique réseau d'un service
   */
  async saveServiceNetworkHistory(serviceName, networkData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const history = await prisma.serviceNetworkHistory.create({
        data: {
          timestamp: new Date(),
          serviceName,
          requestCount: networkData.requestCount || 0,
          successCount: networkData.successCount || 0,
          errorCount: networkData.errorCount || 0,
          avgResponseTimeMs: networkData.avgResponseTimeMs || null,
          minResponseTimeMs: networkData.minResponseTimeMs || null,
          maxResponseTimeMs: networkData.maxResponseTimeMs || null,
          p95ResponseTimeMs: networkData.p95ResponseTimeMs || null,
          p99ResponseTimeMs: networkData.p99ResponseTimeMs || null,
          bytesReceived: networkData.bytesReceived ? BigInt(networkData.bytesReceived) : BigInt(0),
          bytesSent: networkData.bytesSent ? BigInt(networkData.bytesSent) : BigInt(0),
          topEndpoints: networkData.topEndpoints || null,
        },
      });
      
      return history;
    } catch (error) {
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde réseau ${serviceName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder la disponibilité d'un service
   */
  async saveServiceAvailability(serviceName, availabilityData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      // Calculer l'uptime (basé sur l'historique des dernières 24h)
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const history = await prisma.serviceAvailabilityHistory.findMany({
        where: {
          serviceName,
          timestamp: {
            gte: last24h,
          },
        },
      });

      const totalChecks = history.length + 1; // +1 pour l'actuel
      const availableChecks = history.filter(h => h.isAvailable).length + (availabilityData.isAvailable ? 1 : 0);
      const uptimePercent = (availableChecks / totalChecks) * 100;

      const record = await prisma.serviceAvailabilityHistory.create({
        data: {
          timestamp: new Date(),
          serviceName,
          isAvailable: availabilityData.isAvailable || false,
          responseTimeMs: availabilityData.responseTimeMs || null,
          statusCode: availabilityData.statusCode || null,
          errorMessage: availabilityData.errorMessage || null,
          uptimePercent: parseFloat(uptimePercent.toFixed(2)),
        },
      });
      
      return record;
    } catch (error) {
      console.error(`[PERSISTENCE] ❌ Erreur sauvegarde disponibilité ${serviceName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder les métriques de sécurité
   */
  async saveSecurityMetrics(securityData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      // Calculer le score de sécurité (0-100)
      const securityScore = this.calculateSecurityScore(securityData);

      const metrics = await prisma.securityMetric.create({
        data: {
          timestamp: new Date(),
          failedLoginAttempts: securityData.failedLoginAttempts || 0,
          successfulLogins: securityData.successfulLogins || 0,
          blockedIPs: securityData.blockedIPs || [],
          suspiciousActivities: securityData.suspiciousActivities || 0,
          potentialSqlInjections: securityData.potentialSqlInjections || 0,
          potentialXssAttempts: securityData.potentialXssAttempts || 0,
          rateLimitExceeded: securityData.rateLimitExceeded || 0,
          invalidTokenAttempts: securityData.invalidTokenAttempts || 0,
          securityScore,
          activeSecurityAlerts: securityData.activeSecurityAlerts || 0,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Métriques de sécurité sauvegardées (score: ${securityScore})`);
      return metrics;
    } catch (error) {
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde métriques sécurité:', error.message);
      throw error;
    }
  }

  /**
   * Calculer le score de sécurité basé sur les métriques
   */
  calculateSecurityScore(data) {
    let score = 100;

    // Pénalités
    if (data.failedLoginAttempts > 10) score -= 10;
    if (data.failedLoginAttempts > 50) score -= 20;
    if (data.suspiciousActivities > 0) score -= 15;
    if (data.potentialSqlInjections > 0) score -= 25;
    if (data.potentialXssAttempts > 0) score -= 20;
    if (data.invalidTokenAttempts > 20) score -= 10;
    if (data.activeSecurityAlerts > 0) score -= 20;

    // Bonus si tout va bien
    if (data.failedLoginAttempts === 0 && data.suspiciousActivities === 0) {
      score = Math.min(score + 5, 100);
    }

    return Math.max(0, score);
  }

  /**
   * Créer un événement système
   */
  async createSystemEvent(eventData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const event = await prisma.systemEvent.create({
        data: {
          timestamp: new Date(),
          type: eventData.type,
          severity: eventData.severity || 'INFO',
          source: eventData.source,
          title: eventData.title,
          description: eventData.description || null,
          metadata: eventData.metadata || null,
          isAlert: eventData.isAlert || false,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Événement créé: ${event.type} - ${event.title}`);
      return event;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table SystemEvent non trouvée, création ignorée (mode développement)');
          return null;
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur création événement:', error.message);
      throw error;
    }
  }

  /**
   * Nettoyer les anciennes données (> 30 jours par défaut)
   */
  async cleanOldData(daysToKeep = 30) {
    if (!this.isDatabaseEnabled()) {
      return 0;
    }
    
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const results = await Promise.allSettled([
        prisma.systemMetricsSnapshot.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.containerMetricsSnapshot.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.containerLog.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.serviceNetworkHistory.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.serviceAvailabilityHistory.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.securityMetric.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
        prisma.aggregatedLog.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        }),
      ]);

      const deleted = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value?.count || 0), 0);

      console.log(`[PERSISTENCE] ✅ Nettoyage: ${deleted} enregistrements supprimés (> ${daysToKeep} jours)`);
      return deleted;
    } catch (error) {
      console.error('[PERSISTENCE] ❌ Erreur nettoyage:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des métriques système
   */
  async getSystemMetricsHistory(options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const {
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      return await prisma.systemMetricsSnapshot.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table SystemMetricsSnapshot non trouvée, retour de données vides (mode développement)');
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Récupérer l'historique des métriques d'un conteneur
   */
  async getContainerMetricsHistory(containerName, options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const {
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;

    const where = { containerName };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      return await prisma.containerMetricsSnapshot.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table ContainerMetricsSnapshot non trouvée, retour de données vides (mode développement)');
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Récupérer les logs d'un conteneur
   */
  async getContainerLogs(containerName, options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const {
      limit = 100,
      offset = 0,
      stream = null,
      level = null,
      startDate = null,
      endDate = null,
      search = null,
    } = options;

    const where = { containerName };
    
    if (stream) where.stream = stream;
    if (level) where.parsedLevel = level;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    if (search) {
      where.log = {
        contains: search,
        mode: 'insensitive',
      };
    }

    try {
      return await prisma.containerLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table ContainerLog non trouvée, retour de données vides (mode développement)');
          return [];
        }
      }
      throw error;
    }
  }

  /**
   * Sauvegarder un log agrégé (uniquement ERROR, WARN, FATAL)
   */
  async saveAggregatedLog(logData) {
    if (!this.isDatabaseEnabled()) {
      return null;
    }
    
    try {
      const { serviceName, level, message, metadata, stackTrace, userId, requestId } = logData;
      
      // Filtrer : ne stocker que les erreurs critiques et warnings importants
      const criticalLevels = ['ERROR', 'FATAL', 'WARN'];
      if (!criticalLevels.includes(level)) {
        // Ne pas stocker les logs INFO/DEBUG
        return null;
      }
      
      const saved = await prisma.aggregatedLog.create({
        data: {
          timestamp: new Date(),
          serviceName: serviceName || 'unknown',
          level: level || 'INFO',
          message: message || '',
          metadata: metadata || null,
          stackTrace: stackTrace || null,
          userId: userId || null,
          requestId: requestId || null,
        },
      });
      
      console.log(`[PERSISTENCE] ✅ Log agrégé sauvegardé: ${level} - ${serviceName}`);
      return saved;
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PERSISTENCE] ⚠️ Table AggregatedLog non trouvée, sauvegarde ignorée (mode développement)');
          return null;
        }
      }
      console.error('[PERSISTENCE] ❌ Erreur sauvegarde log agrégé:', error.message);
      throw error;
    }
  }

  /**
   * Sauvegarder plusieurs logs agrégés en batch
   */
  async saveMultipleAggregatedLogs(logs) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const results = [];
    for (const logData of logs) {
      try {
        const saved = await this.saveAggregatedLog(logData);
        if (saved) {
          results.push(saved);
        }
      } catch (error) {
        console.error(`[PERSISTENCE] Échec sauvegarde log:`, error.message);
      }
    }
    
    console.log(`[PERSISTENCE] ✅ ${results.length}/${logs.length} logs sauvegardés`);
    return results;
  }

  /**
   * Récupérer les logs agrégés
   */
  async getAggregatedLogs(options = {}) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    try {
      const {
        limit = 100,
        offset = 0,
        serviceName = null,
        level = null,
        startDate = null,
        endDate = null,
        search = null,
      } = options;

      const where = {};
      
      if (serviceName) where.serviceName = serviceName;
      if (level) where.level = level;
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      if (search) {
        where.message = {
          contains: search,
          mode: 'insensitive',
        };
      }

      return await prisma.aggregatedLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });
    } catch (error) {
      // Si la table n'existe pas (P2021) ou autre erreur, retourner un tableau vide
      if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
        console.warn('[PERSISTENCE] Table aggregatedLog non trouvée, retour de données vides');
        return [];
      }
      console.error('[PERSISTENCE] Erreur récupération logs agrégés:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques de disponibilité d'un service
   */
  async getServiceAvailabilityStats(serviceName, hours = 24) {
    if (!this.isDatabaseEnabled()) {
      return {
        serviceName,
        uptimePercent: 100,
        totalChecks: 0,
        availableChecks: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
      };
    }
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const history = await prisma.serviceAvailabilityHistory.findMany({
      where: {
        serviceName,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (history.length === 0) {
      return {
        serviceName,
        uptimePercent: 100,
        totalChecks: 0,
        availableChecks: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
      };
    }

    const availableChecks = history.filter(h => h.isAvailable).length;
    const responseTimes = history
      .filter(h => h.responseTimeMs !== null)
      .map(h => h.responseTimeMs);

    return {
      serviceName,
      uptimePercent: (availableChecks / history.length) * 100,
      totalChecks: history.length,
      availableChecks,
      avgResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      lastCheck: history[history.length - 1],
    };
  }

  /**
   * Récupérer les métriques de sécurité récentes
   */
  async getSecurityMetrics(hours = 24) {
    if (!this.isDatabaseEnabled()) {
      return [];
    }
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await prisma.securityMetric.findMany({
      where: {
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Obtenir un résumé agrégé des métriques de sécurité
   */
  async getSecuritySummary(hours = 24) {
    if (!this.isDatabaseEnabled()) {
      return {
        avgSecurityScore: 100,
        totalFailedLogins: 0,
        totalSuspiciousActivities: 0,
        totalSecurityAlerts: 0,
        totalSqlInjectionAttempts: 0,
        totalXssAttempts: 0,
        uniqueBlockedIPs: 0,
      };
    }
    
    const metrics = await this.getSecurityMetrics(hours);
    
    if (metrics.length === 0) {
      return {
        avgSecurityScore: 100,
        totalFailedLogins: 0,
        totalSuspiciousActivities: 0,
        totalSecurityAlerts: 0,
        totalSqlInjectionAttempts: 0,
        totalXssAttempts: 0,
        uniqueBlockedIPs: 0,
      };
    }

    const total = metrics.reduce((acc, m) => ({
      failedLogins: acc.failedLogins + m.failedLoginAttempts,
      suspicious: acc.suspicious + m.suspiciousActivities,
      alerts: acc.alerts + m.activeSecurityAlerts,
      sqlInjections: acc.sqlInjections + m.potentialSqlInjections,
      xssAttempts: acc.xssAttempts + m.potentialXssAttempts,
      securityScore: acc.securityScore + (m.securityScore || 0),
    }), {
      failedLogins: 0,
      suspicious: 0,
      alerts: 0,
      sqlInjections: 0,
      xssAttempts: 0,
      securityScore: 0,
    });

    // Collecter tous les IPs bloqués uniques
    const allBlockedIPs = new Set();
    metrics.forEach(m => {
      if (Array.isArray(m.blockedIPs)) {
        m.blockedIPs.forEach(ip => allBlockedIPs.add(ip));
      }
    });

    return {
      avgSecurityScore: total.securityScore / metrics.length,
      totalFailedLogins: total.failedLogins,
      totalSuspiciousActivities: total.suspicious,
      totalSecurityAlerts: total.alerts,
      totalSqlInjectionAttempts: total.sqlInjections,
      totalXssAttempts: total.xssAttempts,
      uniqueBlockedIPs: allBlockedIPs.size,
      period: `${hours}h`,
      dataPoints: metrics.length,
    };
  }
}

module.exports = new PersistenceService();

