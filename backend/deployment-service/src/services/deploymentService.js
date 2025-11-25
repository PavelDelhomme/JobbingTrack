const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

class DeploymentService {
  // Créer un nouveau déploiement
  async createDeployment(deploymentData) {
    try {
      // Vérifier si la table existe
      if (!prisma.deployment || typeof prisma.deployment.create !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non disponible, création ignorée (mode développement)');
          return null;
        }
        throw new Error('Table Deployment non disponible');
      }

      const {
        version,
        environment,
        commitHash,
        branch,
        triggeredBy,
        metadata = {}
      } = deploymentData;

      const deployment = await prisma.deployment.create({
        data: {
          version,
          environment,
          status: 'pending',
          startTime: new Date(),
          commitHash,
          branch,
          triggeredBy,
          logs: metadata.logs || [],
          metrics: metadata.metrics || {}
        }
      });

      logger.info('Déploiement créé', {
        id: deployment.id,
        version,
        environment
      });

      return deployment;
    } catch (error) {
      logger.error('Erreur lors de la création du déploiement:', error);
      throw error;
    }
  }

  // Récupérer les déploiements avec filtres
  async getDeployments(filters = {}) {
    try {
      const {
        environment,
        status,
        limit = 50,
        offset = 0,
        startDate,
        endDate
      } = filters;

      const where = {};

      if (environment) where.environment = environment;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Vérifier si la table existe avant d'essayer de la lire
      if (!prisma.deployment || typeof prisma.deployment.findMany !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non disponible, retour de données vides (mode développement)');
          return [];
        }
        throw new Error('Table Deployment non disponible');
      }

      const deployments = await prisma.deployment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return deployments;
    } catch (error) {
      // Fallback si table Deployment n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Deployment non trouvée, retour de données vides (mode développement)');
        return [];
      }
      logger.error('Erreur lors de la récupération des déploiements:', error);
      throw error;
    }
  }

  // Récupérer un déploiement par ID
  async getDeploymentById(id) {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id },
        include: {
          rollbackFrom: true,
          rollbacks: true
        }
      });

      return deployment;
    } catch (error) {
      // Fallback si table Deployment n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Deployment non trouvée, retour null (mode développement)');
        return null;
      }
      logger.error('Erreur lors de la récupération du déploiement:', error);
      throw error;
    }
  }

  // Mettre à jour le statut d'un déploiement
  async updateDeploymentStatus(id, status, additionalData = {}) {
    try {
      // Vérifier si la table existe
      if (!prisma.deployment || typeof prisma.deployment.update !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non disponible, mise à jour ignorée (mode développement)');
          return null;
        }
        throw new Error('Table Deployment non disponible');
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'success' || status === 'failed' || status === 'rolled_back') {
        updateData.endTime = new Date();

        // Calculer la durée si on a un startTime
        let deployment = null;
        try {
          deployment = await prisma.deployment.findUnique({ where: { id } });
        } catch (error) {
          if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
            logger.warn('Table Deployment non trouvée, mise à jour ignorée (mode développement)');
            return null;
          }
          throw error;
        }
        if (deployment && deployment.startTime) {
          updateData.duration = Math.floor(
            (updateData.endTime - deployment.startTime) / 1000
          );
        }
      }

      if (additionalData.logs) {
        updateData.logs = additionalData.logs;
      }

      if (additionalData.metrics) {
        updateData.metrics = additionalData.metrics;
      }

      const updatedDeployment = await prisma.deployment.update({
        where: { id },
        data: updateData
      });

      logger.info('Statut de déploiement mis à jour', {
        id,
        status,
        duration: updateData.duration
      });

      return updatedDeployment;
    } catch (error) {
      // Fallback si table Deployment n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Deployment non trouvée, mise à jour ignorée (mode développement)');
        return null;
      }
      logger.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }

      return updatedDeployment;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  // Enregistrer une métrique de déploiement
  async recordDeploymentMetric(metricData) {
    try {
      const { deploymentId, metricType, value, unit, metadata } = metricData;

      const metric = await prisma.deploymentMetric.create({
        data: {
          deploymentId,
          metricType,
          value,
          unit,
          metadata
        }
      });

      // Mettre à jour les métriques du déploiement
      await this.updateDeploymentMetrics(deploymentId, metric);

      return metric;
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement de la métrique:', error);
      throw error;
    }
  }

  // Mettre à jour les métriques d'un déploiement
  async updateDeploymentMetrics(deploymentId, metric) {
    try {
      // Vérifier si la table existe
      if (!prisma.deployment || typeof prisma.deployment.findUnique !== 'function') {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non disponible, mise à jour métriques ignorée (mode développement)');
          return;
        }
        throw new Error('Table Deployment non disponible');
      }

      let deployment;
      try {
        deployment = await prisma.deployment.findUnique({
          where: { id: deploymentId }
        });
      } catch (error) {
        if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non trouvée, mise à jour métriques ignorée (mode développement)');
          return;
        }
        throw error;
      }

      if (!deployment) return;

      const metrics = deployment.metrics || {};

      // Mettre à jour les métriques en fonction du type
      switch (metric.metricType) {
        case 'build_time':
          metrics.buildTime = metric.value;
          break;
        case 'test_time':
          metrics.testTime = metric.value;
          break;
        case 'deploy_time':
          metrics.deployTime = metric.value;
          break;
        case 'error_rate':
          metrics.errorRate = metric.value;
          break;
        case 'response_time':
          metrics.responseTime = metric.value;
          break;
        case 'downtime_duration':
          metrics.downtimeDuration = metric.value;
          break;
      }

      try {
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { metrics }
        });
      } catch (error) {
        if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
          logger.warn('Table Deployment non trouvée, mise à jour métriques ignorée (mode développement)');
          return;
        }
        throw error;
      }
    } catch (error) {
      // Fallback si table Deployment n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Deployment non trouvée, mise à jour métriques ignorée (mode développement)');
        return;
      }
      logger.error('Erreur lors de la mise à jour des métriques:', error);
    }
  }

  // Récupérer les métriques d'un déploiement
  async getDeploymentMetrics(deploymentId) {
    try {
      const metrics = await prisma.deploymentMetric.findMany({
        where: { deploymentId },
        orderBy: { timestamp: 'asc' }
      });

      return metrics;
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques:', error);
      throw error;
    }
  }

  // Récupérer les métriques agrégées
  async getAggregatedMetrics(filters) {
    try {
      const { metricType, environment, startDate, endDate, aggregation = 'avg' } = filters;

      let where = {};
      if (metricType) where.metricType = metricType;
      if (environment) {
        where.deployment = { environment };
      }
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const aggregationFunction = aggregation === 'sum' ? 'sum' : 'avg';

      const result = await prisma.deploymentMetric.groupBy({
        by: ['metricType', 'unit'],
        where,
        _avg: aggregation === 'avg' ? { value: true } : undefined,
        _sum: aggregation === 'sum' ? { value: true } : undefined,
        _count: { value: true }
      });

      return result;
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques agrégées:', error);
      throw error;
    }
  }

  // Récupérer les métriques pour les analytics du frontend
  async getDeploymentMetrics(filters = {}) {
    try {
      const { environment, days = 30 } = filters;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Récupérer les déploiements récents
      const deployments = await this.getDeployments({
        environment,
        startDate,
        limit: 1000
      });

      // Calculer les métriques
      const totalDeployments = deployments.length;
      const successfulDeployments = deployments.filter(d => d.status === 'success').length;
      const failedDeployments = deployments.filter(d => d.status === 'failed').length;
      const rolledBackDeployments = deployments.filter(d => d.status === 'rolled_back').length;

      // Calculer les temps moyens
      const completedDeployments = deployments.filter(d => d.duration);
      const avgDeploymentTime = completedDeployments.length > 0
        ? completedDeployments.reduce((sum, d) => sum + d.duration, 0) / completedDeployments.length
        : 0;

      // Métriques de performance
      const performanceMetrics = {
        avgBuildTime: 0,
        avgTestTime: 0,
        avgDeployTime: 0,
        avgErrorRate: 0,
        avgResponseTime: 0,
        totalDowntime: 0
      };

      deployments.forEach(deployment => {
        if (deployment.metrics) {
          if (deployment.metrics.buildTime) performanceMetrics.avgBuildTime += deployment.metrics.buildTime;
          if (deployment.metrics.testTime) performanceMetrics.avgTestTime += deployment.metrics.testTime;
          if (deployment.metrics.deployTime) performanceMetrics.avgDeployTime += deployment.metrics.deployTime;
          if (deployment.metrics.errorRate) performanceMetrics.avgErrorRate += deployment.metrics.errorRate;
          if (deployment.metrics.responseTime) performanceMetrics.avgResponseTime += deployment.metrics.responseTime;
          if (deployment.metrics.downtimeDuration) performanceMetrics.totalDowntime += deployment.metrics.downtimeDuration;
        }
      });

      const deploymentCount = deployments.length;
      if (deploymentCount > 0) {
        performanceMetrics.avgBuildTime /= deploymentCount;
        performanceMetrics.avgTestTime /= deploymentCount;
        performanceMetrics.avgDeployTime /= deploymentCount;
        performanceMetrics.avgErrorRate /= deploymentCount;
        performanceMetrics.avgResponseTime /= deploymentCount;
      }

      return {
        overview: {
          totalDeployments,
          successfulDeployments,
          failedDeployments,
          rolledBackDeployments,
          successRate: totalDeployments > 0 ? (successfulDeployments / totalDeployments) * 100 : 0,
          avgDeploymentTime
        },
        performance: performanceMetrics,
        trends: await this.getPerformanceTrends({ environment, days }),
        recentDeployments: deployments.slice(0, 10) // 10 derniers déploiements
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques de déploiement:', error);
      throw error;
    }
  }

  // Récupérer les statistiques de déploiement
  async getDeploymentStats(filters = {}) {
    try {
      const { environment, days = 30 } = filters;
      const metrics = await this.getDeploymentMetrics({ environment, days });

      // Statistiques supplémentaires
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentDeployments = metrics.recentDeployments.filter(d => new Date(d.createdAt) >= weekAgo);
      const thisMonthDeployments = metrics.recentDeployments.filter(d => new Date(d.createdAt) >= monthAgo);

      return {
        ...metrics.overview,
        thisWeek: {
          deployments: recentDeployments.length,
          successful: recentDeployments.filter(d => d.status === 'success').length,
          failed: recentDeployments.filter(d => d.status === 'failed').length,
          rollbacks: recentDeployments.filter(d => d.status === 'rolled_back').length
        },
        thisMonth: {
          deployments: thisMonthDeployments.length,
          successful: thisMonthDeployments.filter(d => d.status === 'success').length,
          failed: thisMonthDeployments.filter(d => d.status === 'failed').length,
          rollbacks: thisMonthDeployments.filter(d => d.status === 'rolled_back').length
        }
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  // Récupérer les tendances de performance
  async getPerformanceTrends(filters = {}) {
    try {
      const { environment, days = 30 } = filters;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Récupérer les métriques par jour
      const dailyMetrics = await prisma.$queryRaw`
        SELECT
          DATE(d."createdAt") as date,
          COUNT(*) as deployment_count,
          AVG(d.duration) as avg_duration,
          AVG(CASE WHEN d.status = 'success' THEN 1 ELSE 0 END) as success_rate,
          AVG(d.metrics->>'errorRate') as avg_error_rate,
          AVG(d.metrics->>'responseTime') as avg_response_time
        FROM deployments d
        WHERE d."createdAt" >= ${startDate}
        AND (${environment ? `d.environment = ${environment}` : '1=1'})
        GROUP BY DATE(d."createdAt")
        ORDER BY date DESC
      `;

      return dailyMetrics;
    } catch (error) {
      logger.error('Erreur lors de la récupération des tendances:', error);
      throw error;
    }
  }

  // Créer une demande de rollback
  async createRollback(rollbackData) {
    try {
      const { deploymentId, reason, triggeredBy } = rollbackData;

      // Vérifier que le déploiement existe
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId }
      });

      if (!deployment) {
        throw new Error('Déploiement non trouvé');
      }

      // Créer la demande de rollback
      const rollback = await prisma.rollback.create({
        data: {
          deploymentId,
          reason,
          triggeredBy,
          status: 'initiated',
          startTime: new Date()
        }
      });

      // Mettre à jour le statut du déploiement
      await this.updateDeploymentStatus(deploymentId, 'rolled_back', {
        rollbackReason: reason
      });

      logger.info('Demande de rollback créée', {
        rollbackId: rollback.id,
        deploymentId,
        reason
      });

      return rollback;
    } catch (error) {
      logger.error('Erreur lors de la création du rollback:', error);
      throw error;
    }
  }

  // Récupérer les rollbacks
  async getRollbacks(filters = {}) {
    try {
      const { deploymentId, status, limit = 50, offset = 0 } = filters;

      const where = {};
      if (deploymentId) where.deploymentId = deploymentId;
      if (status) where.status = status;

      const rollbacks = await prisma.rollback.findMany({
        where,
        include: { deployment: true },
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset
      });

      return rollbacks;
    } catch (error) {
      logger.error('Erreur lors de la récupération des rollbacks:', error);
      throw error;
    }
  }

  // Récupérer un rollback par ID
  async getRollbackById(id) {
    try {
      const rollback = await prisma.rollback.findUnique({
        where: { id },
        include: { deployment: true }
      });

      return rollback;
    } catch (error) {
      logger.error('Erreur lors de la récupération du rollback:', error);
      throw error;
    }
  }

  // Mettre à jour le statut d'un rollback
  async updateRollbackStatus(id, status) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'completed' || status === 'failed') {
        updateData.endTime = new Date();
      }

      const updatedRollback = await prisma.rollback.update({
        where: { id },
        data: updateData
      });

      logger.info('Statut de rollback mis à jour', {
        id,
        status
      });

      return updatedRollback;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut de rollback:', error);
      throw error;
    }
  }

  // Récupérer les statistiques de rollback
  async getRollbackStats(filters = {}) {
    try {
      const { environment, days = 30 } = filters;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const rollbacks = await prisma.rollback.findMany({
        where: {
          startTime: { gte: startDate },
          ...(environment && { deployment: { environment } })
        },
        include: { deployment: true }
      });

      const totalRollbacks = rollbacks.length;
      const completedRollbacks = rollbacks.filter(r => r.status === 'completed').length;
      const failedRollbacks = rollbacks.filter(r => r.status === 'failed').length;

      const avgRollbackTime = rollbacks
        .filter(r => r.duration)
        .reduce((sum, r) => sum + r.duration, 0) / rollbacks.filter(r => r.duration).length || 0;

      return {
        totalRollbacks,
        completedRollbacks,
        failedRollbacks,
        successRate: totalRollbacks > 0 ? (completedRollbacks / totalRollbacks) * 100 : 0,
        avgRollbackTime,
        recentRollbacks: rollbacks.slice(0, 10)
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques de rollback:', error);
      throw error;
    }
  }
}

module.exports = new DeploymentService();
