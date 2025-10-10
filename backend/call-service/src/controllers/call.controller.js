const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getCalls = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type, applicationId, contactId } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Construire les filtres
    const where = {
      userId,
      ...(status && { status }),
      ...(type && { type }),
      ...(applicationId && { applicationId }),
      ...(contactId && { contactId })
    };

    // Récupérer les appels avec les relations
    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          application: {
            select: {
              id: true,
              position: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.call.count({ where })
    ]);

    res.json({
      success: true,
      calls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération appels:', error);
    next(error);
  }
};

const getCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const call = await prisma.call.findFirst({
      where: {
        id,
        userId
      },
      include: {
        application: {
          select: {
            id: true,
            position: true,
            status: true,
            company: {
              select: {
                id: true,
                name: true,
                website: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            email: true,
            phone: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Appel non trouvé'
      });
    }

    res.json({
      success: true,
      call
    });
  } catch (error) {
    logger.error('Erreur récupération appel:', error);
    next(error);
  }
};

const createCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      applicationId,
      contactId,
      type,
      scheduledDate,
      callDate,
      duration,
      status,
      notes,
      outcome,
      followUpNeeded,
      phoneNumber
    } = req.body;

    // Validation des champs requis
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'ID de candidature requis'
      });
    }

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

    // Vérifier le contact si fourni
    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId
        }
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact non trouvé'
        });
      }
    }

    // Créer l'appel
    const call = await prisma.call.create({
      data: {
        userId,
        applicationId,
        contactId,
        type: type || 'OUTGOING',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        callDate: callDate ? new Date(callDate) : null,
        duration: duration ? parseInt(duration) : null,
        status: status || 'SCHEDULED',
        notes,
        outcome,
        followUpNeeded: followUpNeeded || false,
        phoneNumber
      },
      include: {
        application: {
          select: {
            id: true,
            position: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true
          }
        }
      }
    });

    // Créer un événement associé
    try {
      await prisma.activity.create({
        data: {
          applicationId,
          contactId,
          type: 'CALL_MADE',
          description: `Appel ${type || 'OUTGOING'} - ${notes || 'Sans notes'}`,
          metadata: {
            callId: call.id,
            callType: type,
            outcome
          }
        }
      });
    } catch (eventError) {
      logger.warn('Erreur création événement appel:', eventError);
    }

    res.status(201).json({
      success: true,
      message: 'Appel créé avec succès',
      call
    });

    logger.info(`Nouvel appel créé: ${call.id} par ${userId}`);
  } catch (error) {
    logger.error('Erreur création appel:', error);
    next(error);
  }
};

const updateCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      applicationId,
      contactId,
      type,
      scheduledDate,
      callDate,
      duration,
      status,
      notes,
      outcome,
      followUpNeeded,
      phoneNumber
    } = req.body;

    // Vérifier que l'appel existe et appartient à l'utilisateur
    const existingCall = await prisma.call.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingCall) {
      return res.status(404).json({
        success: false,
        error: 'Appel non trouvé'
      });
    }

    // Vérifier que la nouvelle application appartient à l'utilisateur si elle change
    if (applicationId && applicationId !== existingCall.applicationId) {
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
    }

    // Vérifier le contact si fourni et différent
    if (contactId && contactId !== existingCall.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          userId
        }
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact non trouvé'
        });
      }
    }

    // Mettre à jour l'appel
    const call = await prisma.call.update({
      where: { id },
      data: {
        ...(applicationId && { applicationId }),
        ...(contactId !== undefined && { contactId }),
        ...(type && { type }),
        ...(scheduledDate !== undefined && {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null
        }),
        ...(callDate !== undefined && {
          callDate: callDate ? new Date(callDate) : null
        }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(outcome !== undefined && { outcome }),
        ...(followUpNeeded !== undefined && { followUpNeeded }),
        ...(phoneNumber !== undefined && { phoneNumber })
      },
      include: {
        application: {
          select: {
            id: true,
            position: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Appel mis à jour avec succès',
      call
    });

    logger.info(`Appel mis à jour: ${call.id} par ${userId}`);
  } catch (error) {
    logger.error('Erreur modification appel:', error);
    next(error);
  }
};

const deleteCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'appel existe et appartient à l'utilisateur
    const call = await prisma.call.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Appel non trouvé'
      });
    }

    // Supprimer l'appel
    await prisma.call.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Appel supprimé avec succès'
    });

    logger.info(`Appel supprimé: ${id} par ${userId}`);
  } catch (error) {
    logger.error('Erreur suppression appel:', error);
    next(error);
  }
};

const completeCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { outcome, duration, notes } = req.body;

    // Vérifier que l'appel existe et appartient à l'utilisateur
    const existingCall = await prisma.call.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingCall) {
      return res.status(404).json({
        success: false,
        error: 'Appel non trouvé'
      });
    }

    // Marquer l'appel comme terminé avec les données fournies
    const call = await prisma.call.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        callDate: new Date(),
        outcome,
        duration: duration ? parseInt(duration) : null,
        notes: notes !== undefined ? notes : existingCall.notes
      },
      include: {
        application: {
          select: {
            id: true,
            position: true,
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true
          }
        }
      }
    });

    // Créer un événement associé si pas déjà fait
    try {
      await prisma.activity.create({
        data: {
          applicationId: call.applicationId,
          contactId: call.contactId,
          type: 'CALL_COMPLETED',
          description: `Appel terminé - ${outcome || 'Sans résultat spécifié'}`,
          metadata: {
            callId: call.id,
            outcome,
            duration: call.duration
          }
        }
      });
    } catch (eventError) {
      logger.warn('Erreur création événement appel terminé:', eventError);
    }

    res.json({
      success: true,
      message: 'Appel marqué comme terminé',
      call
    });

    logger.info(`Appel terminé: ${call.id} par ${userId}`);
  } catch (error) {
    logger.error('Erreur complétion appel:', error);
    next(error);
  }
};

// Statistiques des appels
const getCallStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { applicationId, startDate, endDate } = req.query;

    // Construire les filtres de date
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where = {
      userId,
      ...(applicationId && { applicationId }),
      ...(Object.keys(dateFilter).length > 0 && {
        OR: [
          { scheduledDate: dateFilter },
          { callDate: dateFilter }
        ]
      })
    };

    // Récupérer les statistiques
    const [
      totalCalls,
      completedCalls,
      scheduledCalls,
      callsByType,
      callsByOutcome,
      averageDuration,
      callsByMonth
    ] = await Promise.all([
      // Total des appels
      prisma.call.count({ where }),

      // Appels terminés
      prisma.call.count({
        where: {
          ...where,
          status: 'COMPLETED'
        }
      }),

      // Appels planifiés
      prisma.call.count({
        where: {
          ...where,
          status: 'SCHEDULED'
        }
      }),

      // Répartition par type
      prisma.call.groupBy({
        by: ['type'],
        where,
        _count: true
      }),

      // Répartition par outcome
      prisma.call.groupBy({
        by: ['outcome'],
        where: {
          ...where,
          status: 'COMPLETED',
          outcome: { not: null }
        },
        _count: true
      }),

      // Durée moyenne
      prisma.call.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
          duration: { not: null }
        },
        _avg: {
          duration: true
        }
      }),

      // Évolution par mois
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "callDate") as month,
          COUNT(*) as count,
          AVG(CAST(duration as FLOAT)) as avg_duration
        FROM calls
        WHERE "userId" = ${userId}
          AND "status" = 'COMPLETED'
          AND "callDate" IS NOT NULL
          ${applicationId ? Prisma.sql`AND "applicationId" = ${applicationId}` : Prisma.empty}
          ${startDate ? Prisma.sql`AND "callDate" >= ${startDate}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND "callDate" <= ${endDate}` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', "callDate")
        ORDER BY month DESC
        LIMIT 12
      `
    ]);

    res.json({
      success: true,
      stats: {
        total: totalCalls,
        completed: completedCalls,
        scheduled: scheduledCalls,
        completionRate: totalCalls > 0 ? (completedCalls / totalCalls * 100).toFixed(1) : 0,
        averageDuration: averageDuration._avg.duration ? Math.round(averageDuration._avg.duration) : 0,
        byType: callsByType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        byOutcome: callsByOutcome.reduce((acc, item) => {
          acc[item.outcome] = item._count;
          return acc;
        }, {}),
        monthlyTrend: callsByMonth
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques appels:', error);
    next(error);
  }
};

// Appels d'une candidature spécifique
const getCallsByApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    // Vérifier que la candidature appartient à l'utilisateur
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

    const calls = await prisma.call.findMany({
      where: { applicationId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      calls,
      total: calls.length
    });
  } catch (error) {
    logger.error('Erreur récupération appels candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des appels téléphoniques opérationnel',
    service: 'call-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getCalls,
  getCall,
  createCall,
  updateCall,
  deleteCall,
  completeCall,
  getCallStats,
  getCallsByApplication,
  getHealth
};
