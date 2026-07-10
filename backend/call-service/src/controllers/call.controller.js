const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function createAutoEvent(userId, data) {
  try {
    const eventType = await prisma.eventType.findFirst({ where: { code: data.typeCode || 'CALL' } })
      ?? await prisma.eventType.findFirst();
    await prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate || new Date(data.startDate.getTime() + 900000),
        allDay: false,
        reminderEnabled: true,
        reminderMinutes: data.reminderMinutes || 15,
        applicationId: data.applicationId || null,
        callId: data.callId || null,
        eventTypeId: eventType?.id || null,
        color: data.color || '#10B981'
      }
    });
    logger.info(`Événement auto créé: ${data.title}`);
  } catch (e) {
    logger.warn('Auto-création événement échouée:', e.message);
  }
}

const sanitizeStatus = (status) => {
  if (!status) return 'SCHEDULED';
  const value = status.toUpperCase();
  const allowed = ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'];
  return allowed.includes(value) ? value : 'SCHEDULED';
};

const mapCall = (call) => ({
  ...call,
  callDate: call.callDate?.toISOString(),
  createdAt: call.createdAt?.toISOString(),
  updatedAt: call.updatedAt?.toISOString()
});

async function getApplicationForUser(applicationId, userId) {
  const aid = applicationId != null ? String(applicationId).trim() : '';
  const uid = userId != null ? String(userId) : '';
  if (!aid || !uid || aid === 'placeholder-application-id') return null;
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT * FROM "Application" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      aid,
      uid
    );
    const row = rows?.[0];
    if (!row) return null;
    const appId = row.id;
    const appUserId = row.userId ?? row.userid;
    const appCompanyId = row.companyId ?? row.companyid;
    if (!appId) return null;
    const company = appCompanyId ? await prisma.company.findUnique({ where: { id: appCompanyId } }).catch(() => null) : null;
    return { ...row, id: appId, userId: appUserId, companyId: appCompanyId, company };
  } catch (_) {
    try {
      return await prisma.application.findFirst({
        where: { id: aid, userId: uid },
        include: { company: true }
      });
    } catch (e) {
      throw e;
    }
  }
}

const getCalls = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      deletedAt: null,
      isArchived: false,
      ...(status && { status: sanitizeStatus(status) })
    };

    let calls, total;
    try {
      [calls, total] = await Promise.all([
        prisma.call.findMany({
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
          orderBy: { callDate: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.call.count({ where })
      ]);
    } catch (error) {
      // Fallback si table Call n'existe pas (P2021) - Mode développement
      if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Call non trouvée, retour de données vides (mode développement)');
        calls = [];
        total = 0;
      } else {
        logger.error('Erreur récupération appels:', error);
        return next(error);
      }
    }

    res.json({
      success: true,
      calls: calls.map(mapCall),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      ...(total === 0 && calls.length === 0 ? {
        warning: 'Table Call non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      } : {})
    });
  } catch (error) {
    logger.error('Erreur récupération appels:', error);
    next(error);
  }
};

const getCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const call = await prisma.call.findFirst({
      where: { id, userId, deletedAt: null, isArchived: false },
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

    if (!call) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé' });
    }

    res.json({ success: true, call: mapCall(call) });
  } catch (error) {
    logger.error('Erreur récupération appel:', error);
    next(error);
  }
};

const createCall = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      applicationId,
      companyId: providedCompanyId,
      contactId,
      subject,
      notes,
      callDate,
      scheduledDate,
      duration,
      status
    } = req.body;

    let companyId = providedCompanyId || null;
    let applicationIdToUse = applicationId || null;

    if (applicationId) {
      const application = await getApplicationForUser(applicationId, userId);
      if (!application) {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      applicationIdToUse = application.id;
      companyId = application.companyId;
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, userId } });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
    }

    const dateValue = callDate || scheduledDate || new Date().toISOString();
    const callDateObj = new Date(dateValue);
    const inferredStatus = callDateObj.getTime() <= Date.now() + 5 * 60 * 1000 ? 'COMPLETED' : 'SCHEDULED';
    const callStatus = status ? sanitizeStatus(status) : inferredStatus;

    const call = await prisma.call.create({
      data: {
        userId,
        applicationId: applicationIdToUse,
        companyId,
        contactId: contactId || null,
        subject: subject || 'Appel de suivi',
        notes: notes || null,
        callDate: callDateObj,
        duration: duration ? parseInt(duration, 10) : null,
        status: callStatus
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

    logger.info(`Appel ${call.id} créé pour l'utilisateur ${userId}`);

    const contactName = call.contact ? `${call.contact.firstName || ''} ${call.contact.lastName || ''}`.trim() : '';
    const companyName = call.application?.company?.name || call.company?.name || '';
    const eventTitle = contactName ? `Appel – ${contactName}` : `Appel – ${companyName || 'Contact'}`;
    await createAutoEvent(userId, {
      title: eventTitle,
      description: call.subject || null,
      startDate: callDateObj,
      endDate: call.duration ? new Date(callDateObj.getTime() + call.duration * 60000) : new Date(callDateObj.getTime() + 900000),
      applicationId: applicationIdToUse,
      callId: call.id,
      typeCode: 'CALL',
      reminderMinutes: 15,
      color: '#10B981'
    });

    res.status(201).json({ success: true, call: mapCall(call) });
  } catch (error) {
    logger.error('Erreur création appel:', error);
    next(error);
  }
};

const updateCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingCall = await prisma.call.findFirst({
      where: { id, userId },
      include: { application: { include: { company: true } } }
    });

    if (!existingCall) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé' });
    }

    let applicationId = existingCall.applicationId;
    let companyId = existingCall.companyId;

    if (req.body.applicationId && req.body.applicationId !== existingCall.applicationId) {
      const application = await getApplicationForUser(req.body.applicationId, userId);
      if (!application) {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      applicationId = application.id;
      companyId = application.companyId;
    }

    if (req.body.contactId && req.body.contactId !== existingCall.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: req.body.contactId, userId } });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
    }

    const dateValue = req.body.callDate || req.body.scheduledDate;

    const call = await prisma.call.update({
      where: { id },
      data: {
        applicationId,
        companyId,
        contactId: req.body.contactId ?? existingCall.contactId,
        followUpId: req.body.followUpId ?? existingCall.followUpId,
        callTypeId: req.body.callTypeId ?? existingCall.callTypeId,
        subject: req.body.subject ?? existingCall.subject,
        notes: req.body.notes ?? existingCall.notes,
        callDate: dateValue ? new Date(dateValue) : existingCall.callDate,
        duration: req.body.duration !== undefined ? parseInt(req.body.duration, 10) : existingCall.duration,
        status: req.body.status ? sanitizeStatus(req.body.status) : existingCall.status
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

    logger.info(`Appel ${id} mis à jour par ${userId}`);

    res.json({ success: true, call: mapCall(call) });
  } catch (error) {
    logger.error('Erreur mise à jour appel:', error);
    next(error);
  }
};

const deleteCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingCall = await prisma.call.findFirst({ where: { id, userId, deletedAt: null } });

    if (!existingCall) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé' });
    }

    const now = new Date();
    await prisma.call.update({ where: { id }, data: { deletedAt: now } });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = ${now} WHERE "callId" = ${id} AND "deletedAt" IS NULL`;
    } catch (e) {
      logger.warn('Cascade soft-delete événements échouée:', e.message);
    }

    logger.info(`Appel ${id} mis à la corbeille par l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Appel déplacé vers la corbeille' });
  } catch (error) {
    logger.error('Erreur suppression appel:', error);
    next(error);
  }
};

const completeCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const existingCall = await prisma.call.findFirst({ where: { id, userId } });

    if (!existingCall) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé' });
    }

    const call = await prisma.call.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        notes: notes ?? existingCall.notes,
        subject: existingCall.subject
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

    res.json({ success: true, call: mapCall(call) });
  } catch (error) {
    logger.error('Erreur complétion appel:', error);
    next(error);
  }
};

const getCallStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [total, byStatus, upcoming, completed] = await Promise.all([
      prisma.call.count({ where: { userId } }),
      prisma.call.groupBy({
        where: { userId },
        by: ['status'],
        _count: true
      }),
      prisma.call.count({
        where: {
          userId,
          status: 'SCHEDULED',
          callDate: { gte: new Date() }
        }
      }),
      prisma.call.count({ where: { userId, status: 'COMPLETED' } })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        upcoming,
        completed,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques appels:', error);
    next(error);
  }
};

const getCallsByApplication = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    const application = await getApplicationForUser(applicationId, userId);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }

    const calls = await prisma.call.findMany({
      where: {
        userId,
        applicationId,
        deletedAt: null
      },
      include: {
        contact: true
      },
      orderBy: { callDate: 'desc' }
    });

    res.json({ success: true, calls: calls.map(mapCall) });
  } catch (error) {
    logger.error('Erreur récupération appels candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des appels opérationnelle',
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
