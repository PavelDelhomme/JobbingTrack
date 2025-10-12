const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// ARCHIVER UNE CANDIDATURE
const archiveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id,
        isArchived: false
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée ou déjà archivée'
      });
    }

    // Archiver la candidature
    const archivedApplication = await prisma.application.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user.id,
        archivedReason: reason || null
      }
    });

    // Archiver automatiquement tous les éléments liés
    await archiveRelatedElements(id, req.user.id, reason);

    // Créer une activité d'archivage
    await prisma.activity.create({
      data: {
        applicationId: id,
        type: 'APPLICATION_ARCHIVED',
        description: `Candidature archivée${reason ? `: ${reason}` : ''}`
      }
    });

    res.json({
      success: true,
      message: 'Candidature archivée avec succès',
      application: archivedApplication
    });

    logger.info(`Candidature archivée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur archivage candidature:', error);
    next(error);
  }
};

// RESTAURER UNE CANDIDATURE
const restoreApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id,
        isArchived: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée ou pas archivée'
      });
    }

    // Restaurer la candidature
    const restoredApplication = await prisma.application.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null
      }
    });

    // Restaurer automatiquement les éléments liés
    await restoreRelatedElements(id);

    // Créer une activité de restauration
    await prisma.activity.create({
      data: {
        applicationId: id,
        type: 'APPLICATION_RESTORED',
        description: 'Candidature restaurée depuis l\'archive'
      }
    });

    res.json({
      success: true,
      message: 'Candidature restaurée avec succès',
      application: restoredApplication
    });

    logger.info(`Candidature restaurée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur restauration candidature:', error);
    next(error);
  }
};

// OBTENIR LES CANDIDATURES ARCHIVÉES
const getArchivedApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      isArchived: true,
      ...(search && {
        OR: [
          { position: { contains: search, mode: 'insensitive' } },
          { company: { name: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          company: true,
          platform: true,
          _count: {
            select: {
              interviews: true,
              followUps: true,
              calls: true
            }
          }
        },
        orderBy: { archivedAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.application.count({ where })
    ]);

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération candidatures archivées:', error);
    next(error);
  }
};

// FONCTION POUR ARCHIVER LES ÉLÉMENTS LIÉS
const archiveRelatedElements = async (applicationId, archivedBy, reason) => {
  try {
    // Archiver tous les entretiens liés
    await prisma.interview.updateMany({
      where: { applicationId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archivedReason: reason
      }
    });

    // Archiver toutes les relances liées
    await prisma.followUp.updateMany({
      where: { applicationId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archivedReason: reason
      }
    });

    // Archiver tous les appels liés
    await prisma.call.updateMany({
      where: { applicationId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archivedReason: reason
      }
    });

    // Archiver toutes les activités liées
    await prisma.activity.updateMany({
      where: { applicationId },
      data: {
        // Les activités restent visibles même si liées à une candidature archivée
        // On pourrait ajouter un champ isArchived aux activités si nécessaire
      }
    });

    logger.info(`Éléments liés archivés pour candidature: ${applicationId}`);
  } catch (error) {
    logger.error('Erreur archivage éléments liés:', error);
    throw error;
  }
};

// FONCTION POUR RESTAURER LES ÉLÉMENTS LIÉS
const restoreRelatedElements = async (applicationId) => {
  try {
    // Restaurer tous les entretiens liés
    await prisma.interview.updateMany({
      where: { applicationId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null
      }
    });

    // Restaurer toutes les relances liées
    await prisma.followUp.updateMany({
      where: { applicationId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null
      }
    });

    // Restaurer tous les appels liés
    await prisma.call.updateMany({
      where: { applicationId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null
      }
    });

    logger.info(`Éléments liés restaurés pour candidature: ${applicationId}`);
  } catch (error) {
    logger.error('Erreur restauration éléments liés:', error);
    throw error;
  }
};

// STATISTIQUES D'ARCHIVAGE
const getArchiveStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.application.groupBy({
      by: ['isArchived'],
      where: { userId },
      _count: {
        id: true
      }
    });

    const archivedCount = stats.find(s => s.isArchived)?._count.id || 0;
    const activeCount = stats.find(s => !s.isArchived)?._count.id || 0;

    res.json({
      success: true,
      stats: {
        total: archivedCount + activeCount,
        archived: archivedCount,
        active: activeCount,
        archivedPercentage: activeCount > 0 ? Math.round((archivedCount / (archivedCount + activeCount)) * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques archivage:', error);
    next(error);
  }
};

// SUPPRIMER DÉFINITIVEMENT UNE CANDIDATURE ARCHIVÉE
const deleteArchivedApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id,
        isArchived: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature archivée non trouvée'
      });
    }

    // Supprimer définitivement (cascade)
    await prisma.application.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Candidature supprimée définitivement'
    });

    logger.info(`Candidature supprimée définitivement: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression candidature archivée:', error);
    next(error);
  }
};

module.exports = {
  archiveApplication,
  restoreApplication,
  getArchivedApplications,
  getArchiveStats,
  deleteArchivedApplication
};
