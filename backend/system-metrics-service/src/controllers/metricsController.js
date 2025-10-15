const metricsService = require('../services/metricsService');
const { logger } = require('../utils/logger');

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
      const {
        endpoint,
        method,
        responseTime,
        statusCode,
        requestSize,
        responseSize,
        userAgent,
        ipAddress,
        userId
      } = req.body;

      if (!endpoint || !method || !responseTime || !statusCode) {
        return res.status(400).json({
          success: false,
          message: 'endpoint, method, responseTime et statusCode sont requis'
        });
      }

      await metricsService.recordPerformanceMetric(
        endpoint,
        method,
        responseTime,
        statusCode,
        requestSize,
        responseSize,
        userAgent,
        ipAddress,
        userId
      );

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
}

module.exports = new MetricsController();
