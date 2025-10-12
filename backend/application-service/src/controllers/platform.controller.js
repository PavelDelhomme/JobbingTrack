const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// CREATE - Créer une plateforme
const createPlatform = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, website, description } = req.body;

    const platform = await prisma.platform.create({
      data: {
        name,
        website,
        description
      }
    });

    res.status(201).json({
      success: true,
      message: 'Plateforme créée avec succès',
      platform
    });

    logger.info(`Plateforme créée: ${platform.id} - ${platform.name}`);
  } catch (error) {
    logger.error('Erreur création plateforme:', error);
    next(error);
  }
};

// READ - Lister les plateformes
const getPlatforms = async (req, res, next) => {
  try {
    const platforms = await prisma.platform.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      platforms
    });
  } catch (error) {
    logger.error('Erreur récupération plateformes:', error);
    next(error);
  }
};

// READ - Une plateforme
const getPlatform = async (req, res, next) => {
  try {
    const { id } = req.params;

    const platform = await prisma.platform.findUnique({
      where: { id }
    });

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Plateforme non trouvée'
      });
    }

    res.json({
      success: true,
      platform
    });
  } catch (error) {
    logger.error('Erreur récupération plateforme:', error);
    next(error);
  }
};

// UPDATE
const updatePlatform = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, website, description, isActive } = req.body;

    const platform = await prisma.platform.update({
      where: { id },
      data: {
        name,
        website,
        description,
        isActive
      }
    });

    res.json({
      success: true,
      message: 'Plateforme mise à jour',
      platform
    });

    logger.info(`Plateforme mise à jour: ${platform.id} - ${platform.name}`);
  } catch (error) {
    logger.error('Erreur mise à jour plateforme:', error);
    next(error);
  }
};

// DELETE
const deletePlatform = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier que la plateforme n'est pas utilisée par des candidatures
    const applicationsCount = await prisma.application.count({
      where: { platformId: id }
    });

    if (applicationsCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer cette plateforme car elle est utilisée par des candidatures'
      });
    }

    await prisma.platform.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Plateforme supprimée'
    });

    logger.info(`Plateforme supprimée: ${id}`);
  } catch (error) {
    logger.error('Erreur suppression plateforme:', error);
    next(error);
  }
};

module.exports = {
  createPlatform,
  getPlatforms,
  getPlatform,
  updatePlatform,
  deletePlatform
};
