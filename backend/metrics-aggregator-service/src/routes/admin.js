/**
 * Routes Admin - Historique des Métriques
 * Nécessite authentification JWT avec role: ADMIN
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware d'authentification
const { authenticateToken } = require('../middlewares/auth.middleware');

const requireAdmin = (req, res, next) => {
  // En mode développement, simuler un utilisateur admin
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      role: 'SUPER_ADMIN',
      email: 'admin@jobbingtrack.test',
      id: 'dev-admin-123'
    };
    return next();
  }
  
  // En production, utiliser l'authentification JWT
  authenticateToken(req, res, () => {
    const user = req.user;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ 
        success: false,
        error: 'Accès refusé. Droits administrateur requis.' 
      });
    }
    next();
  });
};

// Middleware pour SUPER_ADMIN uniquement
const requireSuperAdmin = (req, res, next) => {
  // En mode développement, simuler un super admin
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      role: 'SUPER_ADMIN',
      email: 'admin@jobbingtrack.test',
      id: 'dev-admin-123'
    };
    return next();
  }
  
  // En production, utiliser l'authentification JWT
  authenticateToken(req, res, () => {
    const user = req.user;
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false,
        error: 'Accès refusé. Droits SUPER_ADMIN requis.' 
      });
    }
    next();
  });
};

// Appliquer le middleware à toutes les routes
router.use(requireAdmin);

/**
 * GET /api/admin/metrics/system
 * Historique des métriques système
 */
router.get('/metrics/system', async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    
    const where = {};
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const metrics = await prisma.systemMetricsSnapshot.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    // Convertir BigInt en String pour JSON
    const serialized = metrics.map(m => ({
      ...m,
      memoryUsedBytes: m.memoryUsedBytes.toString(),
      memoryTotalBytes: m.memoryTotalBytes.toString(),
      memoryFreeBytes: m.memoryFreeBytes.toString(),
      diskUsedBytes: m.diskUsedBytes?.toString(),
      diskTotalBytes: m.diskTotalBytes?.toString(),
      diskFreeBytes: m.diskFreeBytes?.toString(),
      networkRxBytes: m.networkRxBytes?.toString(),
      networkTxBytes: m.networkTxBytes?.toString()
    }));

    res.json({
      count: serialized.length,
      data: serialized
    });
  } catch (error) {
    console.error('Erreur récupération métriques système:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/metrics/system/latest
 * Dernière métrique système
 */
router.get('/metrics/system/latest', async (req, res) => {
  try {
    const latest = await prisma.systemMetricsSnapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latest) {
      return res.status(404).json({ error: 'No metrics found' });
    }

    // Convertir BigInt en String
    const serialized = {
      ...latest,
      memoryUsedBytes: latest.memoryUsedBytes.toString(),
      memoryTotalBytes: latest.memoryTotalBytes.toString(),
      memoryFreeBytes: latest.memoryFreeBytes.toString(),
      diskUsedBytes: latest.diskUsedBytes?.toString(),
      diskTotalBytes: latest.diskTotalBytes?.toString(),
      diskFreeBytes: latest.diskFreeBytes?.toString(),
      networkRxBytes: latest.networkRxBytes?.toString(),
      networkTxBytes: latest.networkTxBytes?.toString()
    };

    res.json(serialized);
  } catch (error) {
    console.error('Erreur récupération dernière métrique système:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/metrics/containers
 * Historique des métriques de tous les conteneurs
 */
router.get('/metrics/containers', async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    
    const where = {};
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const metrics = await prisma.containerMetricsSnapshot.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    // Convertir BigInt en String
    const serialized = metrics.map(m => ({
      ...m,
      cpuUsageNano: m.cpuUsageNano?.toString(),
      memoryUsageBytes: m.memoryUsageBytes?.toString(),
      memoryLimitBytes: m.memoryLimitBytes?.toString(),
      networkRxBytes: m.networkRxBytes?.toString(),
      networkTxBytes: m.networkTxBytes?.toString(),
      blockReadBytes: m.blockReadBytes?.toString(),
      blockWriteBytes: m.blockWriteBytes?.toString()
    }));

    res.json({
      count: serialized.length,
      data: serialized
    });
  } catch (error) {
    console.error('Erreur récupération métriques conteneurs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/metrics/container/:name
 * Historique d'un conteneur spécifique
 */
router.get('/metrics/container/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { from, to, limit = 100 } = req.query;
    
    const where = { containerName: name };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const metrics = await prisma.containerMetricsSnapshot.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    // Convertir BigInt en String
    const serialized = metrics.map(m => ({
      ...m,
      cpuUsageNano: m.cpuUsageNano?.toString(),
      memoryUsageBytes: m.memoryUsageBytes?.toString(),
      memoryLimitBytes: m.memoryLimitBytes?.toString(),
      networkRxBytes: m.networkRxBytes?.toString(),
      networkTxBytes: m.networkTxBytes?.toString(),
      blockReadBytes: m.blockReadBytes?.toString(),
      blockWriteBytes: m.blockWriteBytes?.toString()
    }));

    res.json({
      containerName: name,
      count: serialized.length,
      data: serialized
    });
  } catch (error) {
    console.error(`Erreur récupération métriques ${req.params.name}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/events
 * Liste des événements système
 */
router.get('/events', async (req, res) => {
  try {
    const { type, severity, source, isAlert, isResolved, from, to, limit = 100 } = req.query;
    
    const where = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (source) where.source = source;
    if (isAlert !== undefined) where.isAlert = isAlert === 'true';
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const events = await prisma.systemEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/events/:id
 * Détails d'un événement
 */
router.get('/events/:id', async (req, res) => {
  try {
    const event = await prisma.systemEvent.findUnique({
      where: { id: req.params.id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Erreur récupération événement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/events/:id/resolve
 * Marquer un événement comme résolu
 */
router.put('/events/:id/resolve', async (req, res) => {
  try {
    const event = await prisma.systemEvent.update({
      where: { id: req.params.id },
      data: {
        isResolved: true,
        resolvedAt: new Date()
      }
    });

    res.json(event);
  } catch (error) {
    console.error('Erreur résolution événement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/stats/daily
 * Statistiques quotidiennes
 */
router.get('/stats/daily', async (req, res) => {
  try {
    const { from, to, limit = 30 } = req.query;
    
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const stats = await prisma.dailyStats.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit)
    });

    // Convertir BigInt en String
    const serialized = stats.map(s => ({
      ...s,
      totalNetworkRxBytes: s.totalNetworkRxBytes?.toString(),
      totalNetworkTxBytes: s.totalNetworkTxBytes?.toString()
    }));

    res.json({
      count: serialized.length,
      data: serialized
    });
  } catch (error) {
    console.error('Erreur récupération stats quotidiennes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/alerts/thresholds
 * Liste des seuils d'alerte
 */
router.get('/alerts/thresholds', async (req, res) => {
  try {
    const thresholds = await prisma.alertThreshold.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      count: thresholds.length,
      data: thresholds
    });
  } catch (error) {
    console.error('Erreur récupération seuils:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/alerts/thresholds
 * Créer un nouveau seuil d'alerte
 */
router.post('/alerts/thresholds', async (req, res) => {
  try {
    const {
      name,
      description,
      metricType,
      warningThreshold,
      criticalThreshold,
      targetType,
      targetName,
      isEnabled,
      notifyEmail,
      notifySlack
    } = req.body;

    // Validation
    if (!name || !metricType) {
      return res.status(400).json({ error: 'Name and metricType are required' });
    }

    const threshold = await prisma.alertThreshold.create({
      data: {
        name,
        description,
        metricType,
        warningThreshold,
        criticalThreshold,
        targetType: targetType || 'system',
        targetName,
        isEnabled: isEnabled !== false,
        notifyEmail: notifyEmail || false,
        notifySlack: notifySlack || false
      }
    });

    res.status(201).json(threshold);
  } catch (error) {
    console.error('Erreur création seuil:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Threshold name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/alerts/thresholds/:id
 * Mettre à jour un seuil d'alerte
 */
router.put('/alerts/thresholds/:id', async (req, res) => {
  try {
    const threshold = await prisma.alertThreshold.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(threshold);
  } catch (error) {
    console.error('Erreur mise à jour seuil:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Threshold not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/alerts/thresholds/:id
 * Supprimer un seuil d'alerte
 */
router.delete('/alerts/thresholds/:id', async (req, res) => {
  try {
    await prisma.alertThreshold.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression seuil:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Threshold not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/logs
 * Logs agrégés
 */
router.get('/logs', async (req, res) => {
  try {
    const { serviceName, level, userId, requestId, from, to, limit = 100 } = req.query;
    
    const where = {};
    if (serviceName) where.serviceName = serviceName;
    if (level) where.level = level;
    if (userId) where.userId = userId;
    if (requestId) where.requestId = requestId;
    
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const logs = await prisma.aggregatedLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Erreur récupération logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/dashboard
 * Résumé pour le dashboard admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Dernière métrique système
    const latestSystem = await prisma.systemMetricsSnapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    // Nombre de conteneurs actifs
    const latestContainers = await prisma.containerMetricsSnapshot.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // 10 dernières minutes
        }
      },
      distinct: ['containerName'],
      select: {
        containerName: true,
        status: true
      }
    });

    const runningContainers = latestContainers.filter(c => c.status === 'running').length;
    const totalContainers = latestContainers.length;

    // Alertes non résolues
    const unresolvedAlerts = await prisma.systemEvent.count({
      where: {
        isAlert: true,
        isResolved: false
      }
    });

    // Événements récents
    const recentEvents = await prisma.systemEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // Stats des dernières 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eventsLast24h = await prisma.systemEvent.count({
      where: {
        timestamp: { gte: last24h }
      }
    });

    const alertsLast24h = await prisma.systemEvent.count({
      where: {
        timestamp: { gte: last24h },
        isAlert: true
      }
    });

    res.json({
      system: latestSystem ? {
        cpuUsagePercent: latestSystem.cpuUsagePercent,
        memoryUsagePercent: latestSystem.memoryUsagePercent,
        diskUsagePercent: latestSystem.diskUsagePercent,
        timestamp: latestSystem.timestamp
      } : null,
      containers: {
        total: totalContainers,
        running: runningContainers,
        stopped: totalContainers - runningContainers
      },
      alerts: {
        unresolved: unresolvedAlerts,
        last24h: alertsLast24h
      },
      events: {
        last24h: eventsLast24h,
        recent: recentEvents
      }
    });
  } catch (error) {
    console.error('Erreur récupération dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/metrics/cleanup
 * Nettoyer les métriques (SUPER_ADMIN uniquement)
 * Options:
 * - beforeDate: supprimer avant une date (ISO string)
 * - daysToKeep: garder les N derniers jours
 * - all: supprimer tout (nécessite confirmation)
 */
router.delete('/metrics/cleanup', requireSuperAdmin, async (req, res) => {
  try {
    const { beforeDate, daysToKeep, all, confirm } = req.body;

    // Validation
    if (all && confirm !== 'DELETE_ALL_METRICS') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation requise pour supprimer toutes les métriques. Envoyez confirm: "DELETE_ALL_METRICS"'
      });
    }

    let where = {};
    let deletedCount = {
      system: 0,
      containers: 0,
      logs: 0,
      total: 0
    };

    if (all) {
      // Supprimer tout
      deletedCount.system = await prisma.systemMetricsSnapshot.deleteMany({});
      deletedCount.containers = await prisma.containerMetricsSnapshot.deleteMany({});
      deletedCount.logs = await prisma.aggregatedLog.deleteMany({});
    } else if (beforeDate) {
      // Supprimer avant une date
      const date = new Date(beforeDate);
      where.timestamp = { lt: date };
      
      deletedCount.system = await prisma.systemMetricsSnapshot.deleteMany({
        where: { timestamp: { lt: date } }
      });
      deletedCount.containers = await prisma.containerMetricsSnapshot.deleteMany({
        where: { timestamp: { lt: date } }
      });
      deletedCount.logs = await prisma.aggregatedLog.deleteMany({
        where: { timestamp: { lt: date } }
      });
    } else if (daysToKeep) {
      // Garder les N derniers jours
      const days = parseInt(daysToKeep);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({
          success: false,
          error: 'daysToKeep doit être un nombre positif'
        });
      }
      
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      deletedCount.system = await prisma.systemMetricsSnapshot.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      });
      deletedCount.containers = await prisma.containerMetricsSnapshot.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      });
      deletedCount.logs = await prisma.aggregatedLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Spécifiez beforeDate, daysToKeep, ou all avec confirm'
      });
    }

    deletedCount.total = deletedCount.system.count + deletedCount.containers.count + deletedCount.logs.count;

    res.json({
      success: true,
      deleted: deletedCount,
      message: `${deletedCount.total} enregistrements supprimés (Système: ${deletedCount.system.count}, Conteneurs: ${deletedCount.containers.count}, Logs: ${deletedCount.logs.count})`
    });
  } catch (error) {
    console.error('Erreur nettoyage métriques:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du nettoyage des métriques'
    });
  }
});

/**
 * GET /api/admin/metrics/stats
 * Statistiques sur les métriques stockées
 */
router.get('/metrics/stats', async (req, res) => {
  try {
    const [systemCount, containerCount, logsCount, oldestSystem, newestSystem] = await Promise.all([
      prisma.systemMetricsSnapshot.count(),
      prisma.containerMetricsSnapshot.count(),
      prisma.aggregatedLog.count(),
      prisma.systemMetricsSnapshot.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true }
      }),
      prisma.systemMetricsSnapshot.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        system: systemCount,
        containers: containerCount,
        logs: logsCount,
        total: systemCount + containerCount + logsCount,
        oldest: oldestSystem?.timestamp || null,
        newest: newestSystem?.timestamp || null
      }
    });
  } catch (error) {
    console.error('Erreur récupération stats métriques:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
