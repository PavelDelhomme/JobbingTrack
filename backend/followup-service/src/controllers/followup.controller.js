const logger = require('../utils/logger');

const getFollowups = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    // TODO: Implémenter avec Prisma
    res.json({
      success: true,
      followups: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  } catch (error) {
    logger.error('Erreur récupération relances:', error);
    next(error);
  }
};

const getFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // TODO: Implémenter avec Prisma
    res.json({
      success: true,
      followup: {
        id,
        userId,
        // ... autres champs
      }
    });
  } catch (error) {
    logger.error('Erreur récupération relance:', error);
    next(error);
  }
};

const createFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    // TODO: Implémenter avec Prisma
    res.status(201).json({
      success: true,
      followup: {
        id: 'temp-id',
        userId,
        ...data,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Erreur création relance:', error);
    next(error);
  }
};

const updateFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    // TODO: Implémenter avec Prisma
    res.json({
      success: true,
      followup: {
        id,
        userId,
        ...data,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Erreur modification relance:', error);
    next(error);
  }
};

const deleteFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // TODO: Implémenter avec Prisma
    res.json({
      success: true,
      message: 'Relance supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression relance:', error);
    next(error);
  }
};

const completeFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // TODO: Implémenter avec Prisma
    res.json({
      success: true,
      followup: {
        id,
        userId,
        completed: true,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Erreur complétion relance:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des relances opérationnel',
    service: 'followup-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getFollowups,
  getFollowup,
  createFollowup,
  updateFollowup,
  deleteFollowup,
  completeFollowup,
  getHealth
};
