const metricsService = require('../services/metricsService');
const { logger } = require('../utils/logger');
const os = require('os-utils');
const si = require('systeminformation');

class MetricsController {
  // Récupérer les métriques système actuelles
  async getSystemMetrics(req, res) {
    try {
      const metrics = await metricsService.getSystemMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques système:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques système'
      });
    }
  }

  // Récupérer les métriques d'endpoints
  async getEndpointMetrics(req, res) {
    try {
      const metrics = await metricsService.getEndpointMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques d\'endpoints:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques d\'endpoints'
      });
    }
  }

  // Récupérer l'historique des métriques système
  async getSystemMetricsHistory(req, res) {
    try {
      const { hours = 24 } = req.query;
      const metrics = await metricsService.getSystemMetricsHistory(parseInt(hours));
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique des métriques système:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique des métriques système'
      });
    }
  }

  // Récupérer l'historique des métriques de performance
  async getPerformanceMetricsHistory(req, res) {
    try {
      const { hours = 24 } = req.query;
      const metrics = await metricsService.getPerformanceMetricsHistory(parseInt(hours));
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique des métriques de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique des métriques de performance'
      });
    }
  }

  // Enregistrer une métrique de performance
  async recordPerformanceMetric(req, res) {
    try {
      const { endpoint, method, responseTime, statusCode, requestSize, responseSize, userAgent, ipAddress, userId } = req.body;
      
      // Validation des données requises
      if (!endpoint || !method || !responseTime || !statusCode) {
        return res.status(400).json({
          success: false,
          message: 'Les champs endpoint, method, responseTime et statusCode sont obligatoires'
        });
      }

      await metricsService.recordPerformanceMetric({
        endpoint,
        method,
        responseTime,
        statusCode,
        requestSize,
        responseSize,
        userAgent,
        ipAddress,
        userId
      });

      res.status(201).json({
        success: true,
        message: 'Métrique de performance enregistrée avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de la métrique de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement de la métrique de performance'
      });
    }
  }

  // Récupérer les métriques système en temps réel
  async getRealtimeSystemMetrics(req, res) {
    try {
      const [cpuUsage, memory, disk, network] = await Promise.all([
        new Promise(resolve => os.cpuUsage(resolve)),
        si.mem(),
        si.fsSize(),
        si.networkStats()
      ]);

      // Calcul des pourcentages d'utilisation
      const memoryUsage = (memory.used / memory.total) * 100;
      const diskUsage = disk.length > 0 ? (disk[0].used / disk[0].size) * 100 : 0;
      
      // Récupération des statistiques réseau
      const networkIn = network[0]?.rx_sec || 0;
      const networkOut = network[0]?.tx_sec || 0;

      res.json({
        success: true,
        data: {
          cpu: {
            usage: (cpuUsage * 100).toFixed(2),
            cores: os.cpuCount(),
            load: os.loadavg(1).toFixed(2)
          },
          memory: {
            usage: memoryUsage.toFixed(2),
            total: memory.total,
            used: memory.used,
            free: memory.free
          },
          disk: {
            usage: diskUsage.toFixed(2),
            total: disk[0]?.size || 0,
            used: disk[0]?.used || 0,
            free: disk[0]?.available || 0
          },
          network: {
            in: networkIn,
            out: networkOut
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques en temps réel:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques en temps réel'
      });
    }
  }
}

module.exports = new MetricsController();
