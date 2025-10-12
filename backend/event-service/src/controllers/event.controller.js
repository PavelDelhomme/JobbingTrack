const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Récupérer la timeline unifiée pour une entité
const getTimeline = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { startDate, endDate, types } = req.query;
    const userId = req.user.id;

    // Construire les filtres
    const where = {
      ...(entityType === 'application' && { applicationId: entityId }),
      ...(entityType === 'contact' && { contactId: entityId }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      ...(types && { type: { in: types.split(',') } })
    };

    // Vérifier l'accès de l'utilisateur
    if (entityType === 'application') {
      const application = await prisma.application.findFirst({
        where: { id: entityId, userId }
      });
      if (!application) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }
    } else if (entityType === 'contact') {
      const contact = await prisma.contact.findFirst({
        where: { id: entityId, userId }
      });
      if (!contact) {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }
    }

    const events = await prisma.activity.findMany({
      where,
      include: {
        application: {
          include: {
            company: true
          }
        },
        contact: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      timeline: events,
      total: events.length
    });
  } catch (error) {
    logger.error('Erreur récupération timeline:', error);
    next(error);
  }
};

// Récupérer tous les événements de l'utilisateur
const getAllEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Récupérer les IDs des entités de l'utilisateur
    const [applications, contacts] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        select: { id: true }
      }),
      prisma.contact.findMany({
        where: { userId },
        select: { id: true }
      })
    ]);

    const applicationIds = applications.map(a => a.id);
    const contactIds = contacts.map(c => c.id);

    const where = {
      OR: [
        { applicationId: { in: applicationIds } },
        { contactId: { in: contactIds } }
      ],
      ...(type && { type }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [events, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          application: {
            include: {
              company: true
            }
          },
          contact: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.activity.count({ where })
    ]);

    res.json({
      success: true,
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération événements:', error);
    next(error);
  }
};

// Créer un événement personnalisé
const createEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      applicationId,
      contactId,
      type,
      description,
      metadata
    } = req.body;

    // Vérifier l'accès
    if (applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: applicationId, userId }
      });
      if (!application) {
        return res.status(403).json({
          success: false,
          error: 'Application non trouvée'
        });
      }
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, userId }
      });
      if (!contact) {
        return res.status(403).json({
          success: false,
          error: 'Contact non trouvé'
        });
      }
    }

    const event = await prisma.activity.create({
      data: {
        applicationId,
        contactId,
        type,
        description,
        metadata
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
      event
    });

    logger.info(`Événement créé: ${event.id} pour ${userId}`);
  } catch (error) {
    logger.error('Erreur création événement:', error);
    next(error);
  }
};

// Exporter la timeline
const exportTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { entityType, entityId, format = 'json' } = req.query;

    const where = {
      ...(entityType === 'application' && { applicationId: entityId }),
      ...(entityType === 'contact' && { contactId: entityId })
    };

    const events = await prisma.activity.findMany({
      where,
      include: {
        application: {
          include: {
            company: true
          }
        },
        contact: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      // Générer CSV
      const csv = [
        ['Date', 'Type', 'Description', 'Entity'].join(','),
        ...events.map(e => [
          e.createdAt.toISOString(),
          e.type,
          e.description.replace(/,/g, ';'),
          e.application ? e.application.company.name : (e.contact ? `${e.contact.firstName} ${e.contact.lastName}` : 'N/A')
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=timeline_${entityId}.csv`);
      return res.send(csv);
    }

    // Par défaut, retourner JSON
    res.json({
      success: true,
      events,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erreur export timeline:', error);
    next(error);
  }
};

// Statistiques des événements
const getEventStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [applications, contacts] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        select: { id: true }
      }),
      prisma.contact.findMany({
        where: { userId },
        select: { id: true }
      })
    ]);

    const applicationIds = applications.map(a => a.id);
    const contactIds = contacts.map(c => c.id);

    const [totalEvents, eventsByType, recentEvents] = await Promise.all([
      prisma.activity.count({
        where: {
          OR: [
            { applicationId: { in: applicationIds } },
            { contactId: { in: contactIds } }
          ]
        }
      }),
      prisma.activity.groupBy({
        by: ['type'],
        where: {
          OR: [
            { applicationId: { in: applicationIds } },
            { contactId: { in: contactIds } }
          ]
        },
        _count: true
      }),
      prisma.activity.count({
        where: {
          OR: [
            { applicationId: { in: applicationIds } },
            { contactId: { in: contactIds } }
          ],
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total: totalEvents,
        last7Days: recentEvents,
        byType: eventsByType.reduce((acc, item) => {
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

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des événements opérationnel',
    service: 'event-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getTimeline,
  getAllEvents,
  createEvent,
  exportTimeline,
  getEventStats,
  getHealth
};
