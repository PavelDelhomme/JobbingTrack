const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');
const deploymentService = require('../services/deploymentService');

class MetricsController {
  // Enregistrer une métrique de déploiement
  async recordMetric(req, res) {
    try {
      const { deploymentId } = req.params;
      const { metricType, value, unit, metadata } = req.body;

      if (!deploymentId || !metricType || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'deploymentId, metricType et value sont requis'
        });
      }

      const metric = await deploymentService.recordDeploymentMetric({
        deploymentId,
        metricType,
        value: parseFloat(value),
        unit: unit || 'unit',
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Métrique enregistrée avec succès',
        data: metric
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les métriques d'un déploiement spécifique
  async getDeploymentMetrics(req, res) {
    try {
      const { deploymentId } = req.params;

      const metrics = await deploymentService.getDeploymentMetrics(deploymentId);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les métriques agrégées par type
  async getAggregatedMetrics(req, res) {
    try {
      const {
        metricType,
        environment,
        startDate,
        endDate,
        aggregation = 'avg'
      } = req.query;

      const aggregatedMetrics = await deploymentService.getAggregatedMetrics({
        metricType,
        environment,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        aggregation
      });

      res.json({
        success: true,
        data: aggregatedMetrics
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les tendances de performance
  async getPerformanceTrends(req, res) {
    try {
      const { environment, days = 30 } = req.query;

      const trends = await deploymentService.getPerformanceTrends({
        environment,
        days: parseInt(days)
      });

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MetricsController();
