const express = require('express');
const router = express.Router();
const persistenceService = require('../services/persistence.service');
const dockerLogsService = require('../services/docker-logs.service');

/**
 * Routes pour l'accès aux données persistées
 */

// ================== MÉTRIQUES SYSTÈME ==================

/**
 * GET /api/v1/persistence/system/metrics
 * Récupérer l'historique des métriques système
 */
router.get('/system/metrics', async (req, res) => {
  try {
    const { limit, offset, startDate, endDate } = req.query;
    
    const metrics = await persistenceService.getSystemMetricsHistory({
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    console.error('[API] Erreur récupération métriques système:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== MÉTRIQUES CONTENEURS ==================

/**
 * GET /api/v1/persistence/containers/metrics
 * Récupérer l'historique des métriques de tous les conteneurs
 */
router.get('/containers/metrics', async (req, res) => {
  try {
    const { containerName, limit, offset, startDate, endDate } = req.query;
    
    if (containerName) {
      const metrics = await persistenceService.getContainerMetricsHistory(containerName, {
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
        startDate,
        endDate,
      });

      return res.json({
        success: true,
        containerName,
        count: metrics.length,
        data: metrics,
      });
    }

    // Si pas de containerName spécifié, retourner un résumé
    res.json({
      success: true,
      message: 'Veuillez spécifier un containerName',
    });
  } catch (error) {
    console.error('[API] Erreur récupération métriques conteneurs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/containers/:containerName/metrics
 * Récupérer l'historique des métriques d'un conteneur spécifique
 */
router.get('/containers/:containerName/metrics', async (req, res) => {
  try {
    const { containerName } = req.params;
    const { limit, offset, startDate, endDate } = req.query;
    
    const metrics = await persistenceService.getContainerMetricsHistory(containerName, {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      containerName,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    console.error('[API] Erreur récupération métriques conteneur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== LOGS CONTENEURS ==================

/**
 * GET /api/v1/persistence/containers/:containerName/logs
 * Récupérer les logs d'un conteneur
 */
router.get('/containers/:containerName/logs', async (req, res) => {
  try {
    const { containerName } = req.params;
    const { limit, offset, stream, level, startDate, endDate, search } = req.query;
    
    const logs = await persistenceService.getContainerLogs(containerName, {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      stream,
      level,
      startDate,
      endDate,
      search,
    });

    res.json({
      success: true,
      containerName,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('[API] Erreur récupération logs conteneur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/containers/:containerName/logs/live
 * Récupérer les logs en temps réel depuis Docker (pas depuis la DB)
 */
router.get('/containers/:containerName/logs/live', async (req, res) => {
  try {
    const { containerName } = req.params;
    const { tail, since } = req.query;
    
    const logs = await dockerLogsService.getContainerLogs(containerName, {
      tail: parseInt(tail) || 100,
      since: since || 0,
    });

    res.json({
      success: true,
      containerName,
      count: logs.length,
      data: logs,
      source: 'docker_live',
    });
  } catch (error) {
    console.error('[API] Erreur récupération logs live:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/containers/:containerName/inspect
 * Inspecter un conteneur
 */
router.get('/containers/:containerName/inspect', async (req, res) => {
  try {
    const { containerName } = req.params;
    
    const inspection = await dockerLogsService.inspectContainer(containerName);

    res.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error('[API] Erreur inspection conteneur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/containers/:containerName/stats
 * Récupérer les stats d'un conteneur en temps réel
 */
router.get('/containers/:containerName/stats', async (req, res) => {
  try {
    const { containerName } = req.params;
    
    const stats = await dockerLogsService.getContainerStats(containerName);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] Erreur stats conteneur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== DISPONIBILITÉ SERVICES ==================

/**
 * GET /api/v1/persistence/services/:serviceName/availability
 * Récupérer les statistiques de disponibilité d'un service
 */
router.get('/services/:serviceName/availability', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { hours } = req.query;
    
    const stats = await persistenceService.getServiceAvailabilityStats(
      serviceName,
      parseInt(hours) || 24
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] Erreur récupération disponibilité:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== MÉTRIQUES SÉCURITÉ ==================

/**
 * GET /api/v1/persistence/security/metrics
 * Récupérer les métriques de sécurité
 */
router.get('/security/metrics', async (req, res) => {
  try {
    const { hours } = req.query;
    
    const metrics = await persistenceService.getSecurityMetrics(
      parseInt(hours) || 24
    );

    res.json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    console.error('[API] Erreur récupération métriques sécurité:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/security/summary
 * Récupérer le résumé des métriques de sécurité
 */
router.get('/security/summary', async (req, res) => {
  try {
    const { hours } = req.query;
    
    const summary = await persistenceService.getSecuritySummary(
      parseInt(hours) || 24
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[API] Erreur récupération résumé sécurité:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== NETTOYAGE ==================

/**
 * POST /api/v1/persistence/cleanup
 * Nettoyer les anciennes données
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep } = req.body;
    
    const deleted = await persistenceService.cleanOldData(
      parseInt(daysToKeep) || 30
    );

    res.json({
      success: true,
      deleted,
      message: `${deleted} enregistrements supprimés`,
    });
  } catch (error) {
    console.error('[API] Erreur nettoyage:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== LOGS AGRÉGÉS ==================

/**
 * POST /api/v1/persistence/logs
 * Recevoir et sauvegarder des logs depuis les services
 */
router.post('/logs', async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'Un tableau de logs est requis',
      });
    }

    const saved = await persistenceService.saveMultipleAggregatedLogs(logs);

    res.json({
      success: true,
      saved: saved.length,
      total: logs.length,
      message: `${saved.length} logs sauvegardés (seuls ERROR/WARN/FATAL sont stockés)`,
    });
  } catch (error) {
    console.error('[API] Erreur sauvegarde logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/persistence/logs
 * Récupérer les logs agrégés
 */
router.get('/logs', async (req, res) => {
  try {
    const { limit, offset, serviceName, level, startDate, endDate, search } = req.query;
    
    const logs = await persistenceService.getAggregatedLogs({
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      serviceName,
      level,
      startDate,
      endDate,
      search,
    });

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('[API] Erreur récupération logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================== STATS GLOBALES ==================

/**
 * GET /api/v1/persistence/stats
 * Récupérer des statistiques globales sur les données persistées
 */
router.get('/stats', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const [
      systemMetricsCount,
      containerMetricsCount,
      containerLogsCount,
      securityMetricsCount,
      eventsCount,
    ] = await Promise.all([
      prisma.systemMetricsSnapshot.count(),
      prisma.containerMetricsSnapshot.count(),
      prisma.containerLog.count(),
      prisma.securityMetric.count(),
      prisma.systemEvent.count(),
    ]);

    // Obtenir la date du plus ancien et plus récent enregistrement
    const [oldestSystem, newestSystem] = await Promise.all([
      prisma.systemMetricsSnapshot.findFirst({
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      prisma.systemMetricsSnapshot.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          systemMetrics: systemMetricsCount,
          containerMetrics: containerMetricsCount,
          containerLogs: containerLogsCount,
          securityMetrics: securityMetricsCount,
          events: eventsCount,
          total: systemMetricsCount + containerMetricsCount + containerLogsCount + securityMetricsCount + eventsCount,
        },
        dataRange: {
          oldest: oldestSystem?.timestamp || null,
          newest: newestSystem?.timestamp || null,
        },
      },
    });
  } catch (error) {
    console.error('[API] Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

