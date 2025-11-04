const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');
const deploymentService = require('../services/deploymentService');

class DeploymentController {
  // Créer un nouveau déploiement
  async createDeployment(req, res) {
    try {
      const deploymentData = req.body;

      // Validation basique des données
      if (!deploymentData.version || !deploymentData.environment) {
        return res.status(400).json({
          success: false,
          message: 'Version et environnement sont requis'
        });
      }

      const deployment = await deploymentService.createDeployment(deploymentData);

      logger.info('Déploiement créé', {
        deploymentId: deployment.id,
        version: deployment.version,
        environment: deployment.environment
      });

      res.status(201).json({
        success: true,
        message: 'Déploiement créé avec succès',
        data: deployment
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer tous les déploiements avec filtres
  async getDeployments(req, res) {
    try {
      const {
        environment,
        status,
        limit = 50,
        offset = 0,
        startDate,
        endDate
      } = req.query;

      const deployments = await deploymentService.getDeployments({
        environment,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      res.json({
        success: true,
        data: deployments,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: deployments.length
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer un déploiement par ID
  async getDeploymentById(req, res) {
    try {
      const { id } = req.params;

      const deployment = await deploymentService.getDeploymentById(id);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Déploiement non trouvé'
        });
      }

      res.json({
        success: true,
        data: deployment
      });
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le statut d'un déploiement
  async updateDeploymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, logs, metrics } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Statut est requis'
        });
      }

      const updatedDeployment = await deploymentService.updateDeploymentStatus(
        id,
        status,
        { logs, metrics }
      );

      logger.info('Statut de déploiement mis à jour', {
        deploymentId: id,
        status,
        version: updatedDeployment.version
      });

      res.json({
        success: true,
        message: 'Statut mis à jour avec succès',
        data: updatedDeployment
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les métriques de déploiement pour les analytics
  async getDeploymentMetrics(req, res) {
    try {
      const {
        environment,
        days = 30
      } = req.query;

      const metrics = await deploymentService.getDeploymentMetrics({
        environment,
        days: parseInt(days)
      });

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les statistiques de déploiement
  async getDeploymentStats(req, res) {
    try {
      const { environment, days = 30 } = req.query;

      const stats = await deploymentService.getDeploymentStats({
        environment,
        days: parseInt(days)
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DeploymentController();
