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

    const { name, url, website, icon } = req.body;
    const platformUrl = url || website || null;

    const platform = await prisma.platform.create({
      data: {
        name: name.trim(),
        url: platformUrl,
        icon: icon || null,
        userId: req.user.id,
        isPredefined: false
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
    const role = (req.user.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const where = isAdmin
      ? {}
      : {
          OR: [
            { userId: null },
            { userId: req.user.id }
          ]
        };

    const platforms = await prisma.platform.findMany({
      where,
      orderBy: [{ userId: 'asc' }, { name: 'asc' }]
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
    const { name, url, website, icon } = req.body;

    const existing = await prisma.platform.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Plateforme non trouvée' });
    }
    const role = (req.user.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (existing.userId && existing.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Accès refusé à cette plateforme' });
    }

    const platform = await prisma.platform.update({
      where: { id },
      data: {
        ...(name != null ? { name: name.trim() } : {}),
        ...(url != null || website != null ? { url: url || website || null } : {}),
        ...(icon != null ? { icon } : {})
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

    const existing = await prisma.platform.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Plateforme non trouvée' });
    }
    if (existing.userId == null) {
      return res.status(403).json({ success: false, error: 'Impossible de supprimer une plateforme système' });
    }
    const role = (req.user.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (existing.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Accès refusé à cette plateforme' });
    }

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
