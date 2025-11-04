const { logger } = require('../utils/logger');
const deploymentService = require('../services/deploymentService');

class RollbackController {
  // Créer une demande de rollback
  async createRollback(req, res) {
    try {
      const { deploymentId, reason, triggeredBy } = req.body;

      if (!deploymentId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'deploymentId et reason sont requis'
        });
      }

      const rollback = await deploymentService.createRollback({
        deploymentId,
        reason,
        triggeredBy: triggeredBy || 'system'
      });

      logger.info('Demande de rollback créée', {
        rollbackId: rollback.id,
        deploymentId,
        reason,
        triggeredBy
      });

      res.status(201).json({
        success: true,
        message: 'Demande de rollback créée avec succès',
        data: rollback
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer tous les rollbacks avec filtres
  async getRollbacks(req, res) {
    try {
      const {
        deploymentId,
        status,
        limit = 50,
        offset = 0
      } = req.query;

      const rollbacks = await deploymentService.getRollbacks({
        deploymentId,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: rollbacks,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: rollbacks.length
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer un rollback par ID
  async getRollbackById(req, res) {
    try {
      const { id } = req.params;

      const rollback = await deploymentService.getRollbackById(id);

      if (!rollback) {
        return res.status(404).json({
          success: false,
          message: 'Rollback non trouvé'
        });
      }

      res.json({
        success: true,
        data: rollback
      });
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le statut d'un rollback
  async updateRollbackStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Statut est requis'
        });
      }

      const updatedRollback = await deploymentService.updateRollbackStatus(id, status);

      logger.info('Statut de rollback mis à jour', {
        rollbackId: id,
        status
      });

      res.json({
        success: true,
        message: 'Statut de rollback mis à jour avec succès',
        data: updatedRollback
      });
    } catch (error) {
      throw error;
    }
  }

  // Récupérer les statistiques de rollback
  async getRollbackStats(req, res) {
    try {
      const { environment, days = 30 } = req.query;

      const stats = await deploymentService.getRollbackStats({
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

module.exports = new RollbackController();
