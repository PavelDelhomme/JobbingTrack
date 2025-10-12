const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Récupérer toutes les relances
const getFollowups = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, completed, type, applicationId } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Vérifier que l'utilisateur a accès aux candidatures
    const userApplications = await prisma.application.findMany({
      where: { userId },
      select: { id: true }
    });
    const applicationIds = userApplications.map(app => app.id);

    const where = {
      applicationId: { in: applicationIds },
      ...(completed !== undefined && { completed: completed === 'true' }),
      ...(type && { type }),
      ...(applicationId && { applicationId })
    };

    const [followups, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          application: {
            include: {
              company: true
            }
          },
          contact: true
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.followUp.count({ where })
    ]);

    res.json({
      success: true,
      followups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération relances:', error);
    next(error);
  }
};

// Récupérer une relance
const getFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const followup = await prisma.followUp.findFirst({
      where: { id },
      include: {
        application: {
          include: {
            company: true,
            user: true
          }
        },
        contact: true
      }
    });

    if (!followup) {
      return res.status(404).json({
        success: false,
        error: 'Relance non trouvée'
      });
    }

    // Vérifier que l'utilisateur a accès
    if (followup.application.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }

    res.json({
      success: true,
      followup
    });
  } catch (error) {
    logger.error('Erreur récupération relance:', error);
    next(error);
  }
};

// Créer une relance
const createFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      applicationId,
      contactId,
      type,
      scheduledDate,
      subject,
      message
    } = req.body;

    // Vérifier que l'application appartient à l'utilisateur
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const followup = await prisma.followUp.create({
      data: {
        applicationId,
        contactId,
        type,
        scheduledDate: new Date(scheduledDate),
        subject,
        message
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        contact: true
      }
    });

    res.status(201).json({
      success: true,
      followup
    });

    logger.info(`Relance créée: ${followup.id} pour ${userId}`);
  } catch (error) {
    logger.error('Erreur création relance:', error);
    next(error);
  }
};

// Mettre à jour une relance
const updateFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    // Vérifier l'accès
    const followup = await prisma.followUp.findFirst({
      where: { id },
      include: {
        application: true
      }
    });

    if (!followup || followup.application.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Relance non trouvée'
      });
    }

    const updatedFollowup = await prisma.followUp.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        contact: true
      }
    });

    res.json({
      success: true,
      followup: updatedFollowup
    });
  } catch (error) {
    logger.error('Erreur modification relance:', error);
    next(error);
  }
};

// Supprimer une relance
const deleteFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const followup = await prisma.followUp.findFirst({
      where: { id },
      include: {
        application: true
      }
    });

    if (!followup || followup.application.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Relance non trouvée'
      });
    }

    await prisma.followUp.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Relance supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression relance:', error);
    next(error);
  }
};

// Marquer comme terminée
const completeFollowup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { response } = req.body;

    const followup = await prisma.followUp.findFirst({
      where: { id },
      include: {
        application: true
      }
    });

    if (!followup || followup.application.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Relance non trouvée'
      });
    }

    const updatedFollowup = await prisma.followUp.update({
      where: { id },
      data: {
        completed: true,
        completedDate: new Date(),
        response
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        contact: true
      }
    });

    res.json({
      success: true,
      followup: updatedFollowup
    });
  } catch (error) {
    logger.error('Erreur complétion relance:', error);
    next(error);
  }
};

// Statistiques
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userApplications = await prisma.application.findMany({
      where: { userId },
      select: { id: true }
    });
    const applicationIds = userApplications.map(app => app.id);

    const [
      totalFollowups,
      completedFollowups,
      pendingFollowups,
      overdueFollowups,
      followupsByType,
      successRate
    ] = await Promise.all([
      prisma.followUp.count({
        where: { applicationId: { in: applicationIds } }
      }),
      prisma.followUp.count({
        where: {
          applicationId: { in: applicationIds },
          completed: true
        }
      }),
      prisma.followUp.count({
        where: {
          applicationId: { in: applicationIds },
          completed: false,
          scheduledDate: { gte: new Date() }
        }
      }),
      prisma.followUp.count({
        where: {
          applicationId: { in: applicationIds },
          completed: false,
          scheduledDate: { lt: new Date() }
        }
      }),
      prisma.followUp.groupBy({
        by: ['type'],
        where: { applicationId: { in: applicationIds } },
        _count: true
      }),
      prisma.followUp.count({
        where: {
          applicationId: { in: applicationIds },
          completed: true,
          response: { not: null }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total: totalFollowups,
        completed: completedFollowups,
        pending: pendingFollowups,
        overdue: overdueFollowups,
        completionRate: totalFollowups > 0 ? ((completedFollowups / totalFollowups) * 100).toFixed(1) : 0,
        successRate: completedFollowups > 0 ? ((successRate / completedFollowups) * 100).toFixed(1) : 0,
        byType: followupsByType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    next(error);
  }
};

// Suggestions de relances
const getSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Récupérer les candidatures sans relance depuis plus de 7 jours
    const applications = await prisma.application.findMany({
      where: {
        userId,
        status: {
          in: ['SENT', 'IN_REVIEW', 'INTERVIEW_SCHEDULED']
        },
        followUps: {
          none: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },
      include: {
        company: true,
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 10
    });

    const suggestions = applications.map(app => ({
      application: app,
      suggestedDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
      suggestedType: 'EMAIL',
      reason: app.followUps.length === 0 
        ? 'Aucune relance effectuée'
        : 'Plus de 7 jours depuis la dernière relance'
    }));

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    logger.error('Erreur récupération suggestions:', error);
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
  getStats,
  getSuggestions,
  getHealth
};
