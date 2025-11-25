const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const sanitizeStatus = (status) => {
  if (!status) return 'PENDING';
  const value = status.toUpperCase();
  const allowed = ['PENDING', 'POSITIVE_RESPONSE', 'NEGATIVE_RESPONSE', 'NO_RESPONSE', 'PLANNED'];
  return allowed.includes(value) ? value : 'PENDING';
};

const mapFollowup = (followup) => ({
  ...followup,
  followUpDate: followup.followUpDate?.toISOString(),
  createdAt: followup.createdAt?.toISOString(),
  updatedAt: followup.updatedAt?.toISOString()
});

const getFollowups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...(status && { status: sanitizeStatus(status) })
    };

    let followups, total;
    try {
      [followups, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            application: {
              include: {
                company: true
              }
            },
            company: true,
            contact: true
          },
          orderBy: { followUpDate: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.followUp.count({ where })
      ]);
    } catch (error) {
      // Fallback si table FollowUp n'existe pas (P2021) - Mode développement
      if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
        logger.warn('Table FollowUp non trouvée, retour de données vides (mode développement)');
        followups = [];
        total = 0;
      } else {
        logger.error('Erreur récupération relances:', error);
        return next(error);
      }
    }

    res.json({
      success: true,
      followups: followups.map(mapFollowup),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      ...(total === 0 && followups.length === 0 ? {
        warning: 'Table FollowUp non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      } : {})
    });
  } catch (error) {
    logger.error('Erreur récupération relances:', error);
    next(error);
  }
};

const getFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const followup = await prisma.followUp.findFirst({
      where: { id, userId },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        contact: true
      }
    });

    if (!followup) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée' });
    }

    res.json({ success: true, followup: mapFollowup(followup) });
  } catch (error) {
    logger.error('Erreur récupération relance:', error);
    next(error);
  }
};

const createFollowup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      applicationId,
      contactId,
      followUpDate,
      scheduledDate,
      scheduledFor,
      notes,
      status
    } = req.body;

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { company: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
    }

    const dateValue = followUpDate || scheduledDate || scheduledFor;

    const followup = await prisma.followUp.create({
      data: {
        userId,
        applicationId,
        companyId: application.companyId,
        contactId: contactId || null,
        followUpDate: new Date(dateValue),
        notes: notes || null,
        status: sanitizeStatus(status)
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        contact: true
      }
    });

    logger.info(`Relance ${followup.id} créée pour l'utilisateur ${userId}`);

    res.status(201).json({ success: true, followup: mapFollowup(followup) });
  } catch (error) {
    logger.error('Erreur création relance:', error);
    next(error);
  }
};

const updateFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingFollowup = await prisma.followUp.findFirst({
      where: { id, userId },
      include: { application: { include: { company: true } } }
    });

    if (!existingFollowup) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée' });
    }

    let companyId = existingFollowup.companyId;
    let applicationId = existingFollowup.applicationId;

    if (req.body.applicationId && req.body.applicationId !== existingFollowup.applicationId) {
      const newApplication = await prisma.application.findFirst({
        where: { id: req.body.applicationId, userId },
        include: { company: true }
      });

      if (!newApplication) {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }

      applicationId = newApplication.id;
      companyId = newApplication.companyId;
    }

    if (req.body.contactId && req.body.contactId !== existingFollowup.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: req.body.contactId, userId } });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
    }

    const dateValue = req.body.followUpDate || req.body.scheduledDate || req.body.scheduledFor;

    const followup = await prisma.followUp.update({
      where: { id },
      data: {
        applicationId,
        companyId,
        contactId: req.body.contactId ?? existingFollowup.contactId,
        followUpDate: dateValue ? new Date(dateValue) : existingFollowup.followUpDate,
        notes: req.body.notes ?? existingFollowup.notes,
        status: req.body.status ? sanitizeStatus(req.body.status) : existingFollowup.status
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        contact: true
      }
    });

    logger.info(`Relance ${id} mise à jour par ${userId}`);

    res.json({ success: true, followup: mapFollowup(followup) });
  } catch (error) {
    logger.error('Erreur mise à jour relance:', error);
    next(error);
  }
};

const deleteFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingFollowup = await prisma.followUp.findFirst({ where: { id, userId } });

    if (!existingFollowup) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée' });
    }

    await prisma.followUp.delete({ where: { id } });

    logger.info(`Relance ${id} supprimée pour l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Relance supprimée' });
  } catch (error) {
    logger.error('Erreur suppression relance:', error);
    next(error);
  }
};

const completeFollowup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { response, status } = req.body;

    const existingFollowup = await prisma.followUp.findFirst({ where: { id, userId } });

    if (!existingFollowup) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée' });
    }

    const followup = await prisma.followUp.update({
      where: { id },
      data: {
        response: response || null,
        status: sanitizeStatus(status || 'POSITIVE_RESPONSE')
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        contact: true
      }
    });

    res.json({ success: true, followup: mapFollowup(followup) });
  } catch (error) {
    logger.error('Erreur complétion relance:', error);
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [total, byStatus, upcoming, overdue] = await Promise.all([
      prisma.followUp.count({ where: { userId } }),
      prisma.followUp.groupBy({
        where: { userId },
        by: ['status'],
        _count: true
      }),
      prisma.followUp.count({
        where: {
          userId,
          status: { in: ['PENDING', 'PLANNED'] },
          followUpDate: { gte: new Date() }
        }
      }),
      prisma.followUp.count({
        where: {
          userId,
          status: { in: ['PENDING', 'PLANNED'] },
          followUpDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        upcoming,
        overdue,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques relances:', error);
    next(error);
  }
};

const getSuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const suggestions = await prisma.application.findMany({
      where: {
        userId,
        status: {
          in: ['CANDIDATE_PENDING', 'NO_RESPONSE', 'FIRST_INTERVIEW_PENDING']
        },
        followUps: {
          none: {
            followUpDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },
      include: {
        company: true
      },
      take: 5
    });

    res.json({
      success: true,
      suggestions: suggestions.map((app) => ({
        applicationId: app.id,
        company: app.company?.name,
        position: app.position,
        status: app.status,
        suggestedAction: 'Planifier une relance cette semaine'
      }))
    });
  } catch (error) {
    logger.error('Erreur récupération suggestions relances:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des relances opérationnelle',
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
