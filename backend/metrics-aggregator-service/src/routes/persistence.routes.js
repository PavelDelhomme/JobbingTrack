const express = require('express');
const router = express.Router();
const persistenceService = require('../services/persistence.service');
const dockerLogsService = require('../services/docker-logs.service');

/**
 * Convertit récursivement les BigInt (et Dates) pour que JSON.stringify ne plante pas.
 */
function serializeForJson(val) {
  if (val === null) return null;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val !== 'object') return val;
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(serializeForJson);
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    out[k] = serializeForJson(v);
  }
  return out;
}

/** Limite sécurisée pour les historiques métriques (points par requête). */
function parseMetricsHistoryLimit(value, fallback = 100, max = 60000) {
  const n = parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

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
    
    console.log('[API] 📊 Requête métriques système:', { limit, offset, startDate, endDate });
    
    const metrics = await persistenceService.getSystemMetricsHistory({
      limit: parseMetricsHistoryLimit(limit, 100),
      offset: parseInt(offset) || 0,
      startDate,
      endDate,
    });

    console.log('[API] ✅ Métriques récupérées:', metrics.length, 'points');
    if (metrics.length > 0) {
      console.log('[API] 🔍 Premier point:', {
        timestamp: metrics[0].timestamp,
        cpuUsagePercent: metrics[0].cpuUsagePercent
      });
    }

    res.json({
      success: true,
      count: metrics.length,
      data: serializeForJson(metrics),
    });
  } catch (error) {
    console.error('[API] ❌ Erreur récupération métriques système:', error.message);
    console.error('[API] ❌ Stack:', error.stack);
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
        limit: parseMetricsHistoryLimit(limit, 100),
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

/** Sérialise BigInt pour JSON (évite "Do not know how to serialize a BigInt") */
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = serializeBigInt(obj[k]);
    return out;
  }
  return obj;
}

/**
 * GET /api/v1/persistence/containers/:containerName/metrics
 * Récupérer l'historique des métriques d'un conteneur spécifique
 */
router.get('/containers/:containerName/metrics', async (req, res) => {
  try {
    const { containerName } = req.params;
    const { limit, offset, startDate, endDate } = req.query;
    
    const metrics = await persistenceService.getContainerMetricsHistory(containerName, {
      limit: parseMetricsHistoryLimit(limit, 100),
      offset: parseInt(offset) || 0,
      startDate,
      endDate,
    });

    res.json(serializeBigInt({
      success: true,
      containerName,
      count: metrics.length,
      data: metrics,
    }));
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
 * - Par défaut : statistiques agrégées (`hours`, défaut 24 h).
 * - `history=1` + `startDate` / `endDate` / `limit` : série brute `service_availability_history` (corrélation front).
 *   (Même chemin que les stats pour éviter les 404 si un proxy ne connaît pas un sous-chemin `/history`.)
 */
router.get('/services/:serviceName/availability', async (req, res) => {
  try {
    const serviceName = decodeURIComponent(String(req.params.serviceName || '').trim());
    const { hours, startDate, endDate, limit, history } = req.query;

    if (history === '1' || history === 'true') {
      const rows = await persistenceService.getServiceAvailabilityHistory(serviceName, {
        startDate,
        endDate,
        limit: parseInt(String(limit), 10) || 400,
      });
      return res.json(
        serializeBigInt({
          success: true,
          serviceName,
          count: rows.length,
          data: rows,
        })
      );
    }

    const stats = await persistenceService.getServiceAvailabilityStats(
      serviceName,
      parseInt(String(hours), 10) || 24
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[API] Erreur disponibilité service:', error);
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
    console.warn('[API] Erreur récupération métriques sécurité (retour vide):', error.message);
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    console.warn('[API] Erreur récupération résumé sécurité (retour zéro):', error.message);
    res.status(200).json({
      success: true,
      data: {
        avgSecurityScore: 100,
        totalFailedLogins: 0,
        totalSuspiciousActivities: 0,
        totalSecurityAlerts: 0,
        totalSqlInjectionAttempts: 0,
        totalXssAttempts: 0,
        uniqueBlockedIPs: 0,
        period: `${parseInt(hours) || 24}h`,
        dataPoints: 0,
        source: 'empty',
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    const { limit, offset, serviceName, serviceNames, level, startDate, endDate, search } = req.query;

    let serviceNamesList = null;
    if (serviceNames != null && String(serviceNames).trim()) {
      serviceNamesList = String(serviceNames)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 32);
    }

    const logs = await persistenceService.getAggregatedLogs({
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      serviceName,
      serviceNames: serviceNamesList,
      level,
      startDate,
      endDate,
      search,
    });

    res.json({
      success: true,
      count: logs.length,
      data: logs || [],
    });
  } catch (error) {
    // Ne jamais retourner 500, toujours retourner 200 avec un tableau vide
    console.warn('[API] Erreur récupération logs (retour tableau vide):', error.message);
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      cached: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    const countTables = [
      ['systemMetricsSnapshots', 'system_metrics_snapshots'],
      ['containerMetricsSnapshots', 'container_metrics_snapshots'],
      ['containerLogs', 'container_logs'],
      ['securityMetrics', 'security_metrics'],
      ['events', 'system_events'],
      ['aggregatedLogs', 'aggregated_logs'],
      ['logCollectorLogs', 'log_collector_logs'],
      ['systemMetricsRaw', 'system_metrics'],
      ['containerMetricsRaw', 'container_metrics'],
      ['serviceAvailability', 'service_availability_history'],
      ['serviceNetwork', 'service_network_history'],
    ];

    const countTable = async (tableName) => {
      const tableExists = await prisma.$queryRawUnsafe(
        `SELECT to_regclass('public.${tableName}')::text AS table_name`,
      );
      if (!tableExists?.[0]?.table_name) return 0;

      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM public.${tableName}`,
      );
      return Number(rows?.[0]?.count || 0);
    };

    const counts = {};
    await Promise.all(
      countTables.map(async ([key, tableName]) => {
        counts[key] = await countTable(tableName).catch(() => 0);
      }),
    );

    // Compatibilité UI historique : ces clés restent les totaux "principaux".
    counts.systemMetrics = counts.systemMetricsSnapshots + counts.systemMetricsRaw;
    counts.containerMetrics = counts.containerMetricsSnapshots + counts.containerMetricsRaw;
    counts.total = countTables
      .map(([key]) => counts[key] || 0)
      .reduce((sum, value) => sum + value, 0);

    const rangeRows = await prisma.$queryRawUnsafe(`
      SELECT MIN(ts) AS oldest, MAX(ts) AS newest
      FROM (
        SELECT timestamp AS ts FROM public.system_metrics_snapshots
        UNION ALL SELECT timestamp AS ts FROM public.container_metrics_snapshots
        UNION ALL SELECT timestamp AS ts FROM public.system_events
        UNION ALL SELECT timestamp AS ts FROM public.aggregated_logs
        UNION ALL SELECT timestamp AS ts FROM public.log_collector_logs
        UNION ALL SELECT timestamp AS ts FROM public.system_metrics
        UNION ALL SELECT timestamp AS ts FROM public.container_metrics
        UNION ALL SELECT timestamp AS ts FROM public.service_availability_history
      ) AS persisted_timestamps
    `).catch(() => [{ oldest: null, newest: null }]);
    const range = rangeRows?.[0] || {};

    res.json({
      success: true,
      data: {
        counts,
        dataRange: {
          oldest: range.oldest || null,
          newest: range.newest || null,
        },
      },
    });
  } catch (error) {
    console.warn('[API] Erreur récupération stats (retour minimal):', error.message);
    res.status(200).json({
      success: true,
      data: {
        counts: {
          systemMetrics: 0,
          containerMetrics: 0,
          containerLogs: 0,
          securityMetrics: 0,
          events: 0,
          total: 0,
        },
        dataRange: {
          oldest: null,
          newest: null,
        },
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;

