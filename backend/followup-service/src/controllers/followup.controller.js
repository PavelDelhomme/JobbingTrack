const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function isAutoStatusEnabled(userId) {
  try {
    if (!userId) return true;
    const customization = await prisma.userCustomization.findUnique({ where: { userId } });
    if (!customization?.settings) return true;
    return customization.settings.statusEngine?.autoStatusEnabled !== false;
  } catch {
    return true;
  }
}

async function updateApplicationStatus(applicationId, statusCode, comment, userId) {
  try {
    if (userId) {
      const autoEnabled = await isAutoStatusEnabled(userId);
      if (!autoEnabled) {
        logger.info(`Auto-statut désactivé pour user ${userId}, cascade ignorée (${statusCode})`);
        return;
      }
    }
    const statusRow = await prisma.applicationStatus.findFirst({ where: { code: statusCode } });
    if (!statusRow) return;
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { statusId: true, userId: true, statusEngineOptOut: true }
    });
    if (!app || app.statusId === statusRow.id) return;
    if (app.statusEngineOptOut === true) {
      logger.info(`Cascade ignorée pour candidature ${applicationId} (statusEngineOptOut=true)`);
      return;
    }
    await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        previousStatusId: app.statusId || null,
        newStatusId: statusRow.id,
        comment: comment || null
      }
    });
    await prisma.application.update({ where: { id: applicationId }, data: { statusId: statusRow.id } });
    logger.info(`Statut candidature ${applicationId} mis à jour → ${statusCode}`);
  } catch (e) {
    logger.warn(`Cascade statut candidature échouée (${statusCode}):`, e.message);
  }
}

async function createAutoEvent(userId, data) {
  try {
    const eventType = await prisma.eventType.findFirst({ where: { code: data.typeCode || 'FOLLOWUP' } })
      ?? await prisma.eventType.findFirst();
    await prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate || new Date(data.startDate.getTime() + 1800000),
        allDay: false,
        reminderEnabled: true,
        reminderMinutes: data.reminderMinutes || 60,
        applicationId: data.applicationId || null,
        followUpId: data.followUpId || null,
        eventTypeId: eventType?.id || null,
        color: data.color || '#F59E0B'
      }
    });
    logger.info(`Événement auto créé: ${data.title}`);
  } catch (e) {
    logger.warn('Auto-création événement échouée:', e.message);
  }
}

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
  updatedAt: followup.updatedAt?.toISOString(),
  ...(followup.contacts?.[0]?.contact ? { contact: followup.contacts[0].contact } : {}),
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

const getFollowups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, applicationId } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10) || 100, 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      deletedAt: null,
      isArchived: false,
      ...(status && { status: { code: sanitizeStatus(status) } }),
      ...(applicationId && applicationId.trim() && { applicationId: applicationId.trim() })
    };

    let followups, total, usedFallback = false;
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
            status: true,
            contacts: { include: { contact: true } }
          },
          orderBy: { followUpDate: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.followUp.count({ where })
      ]);
    } catch (error) {
      // Fallback : table manquante (P2021) ou schéma incohérent (ex. Application.status vs statusId)
      const isTableMissing = error.code === 'P2021';
      const isSchemaError = error.message?.includes('does not exist') || error.code === 'P2022';
      if (isTableMissing || isSchemaError || process.env.NODE_ENV !== 'production') {
        logger.warn('Relances: fallback sans include (table ou schéma)', { code: error.code, message: error.message?.slice(0, 120) });
        usedFallback = true;
        try {
          [followups, total] = await Promise.all([
            prisma.followUp.findMany({
              where,
              include: { status: true },
              orderBy: { followUpDate: 'desc' },
              skip,
              take: limitNum
            }),
            prisma.followUp.count({ where })
          ]);
        } catch (fallbackErr) {
          logger.warn('Relances: retour vide (mode développement)', { message: fallbackErr.message?.slice(0, 80) });
          followups = [];
          total = 0;
        }
      } else {
        logger.error('Erreur récupération relances:', error);
        return next(error);
      }
    }

    const warning = usedFallback
      ? 'Données partiellement chargées (schéma BDD à aligner avec "make db-push-all").'
      : (total === 0 && followups.length === 0 ? 'Table FollowUp non trouvée. Exécutez "make db-push-all" pour créer les tables.' : null);

    res.json({
      success: true,
      followups: followups.map(mapFollowup),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      ...(warning ? { warning } : {})
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

    const include = {
      application: { include: { company: true } },
      company: true,
      status: true,
      contacts: { include: { contact: true } }
    };

    let followup;
    try {
      followup = await prisma.followUp.findFirst({
        where: { id, userId, deletedAt: null, isArchived: false },
        include
      });
    } catch (err) {
      if (err.message?.includes('does not exist') || err.code === 'P2021' || err.code === 'P2022') {
        followup = await prisma.followUp.findFirst({
          where: { id, userId },
          include: {
            application: { include: { company: true } },
            company: true
          }
        }).catch(() => null);
      } else {
        throw err;
      }
    }

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

    const application = await getApplicationForUser(applicationId, userId);
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
    const statusCode = sanitizeStatus(status);
    const statusRow = await prisma.followUpStatus.findFirst({
      where: { code: statusCode }
    });
    const statusIdToUse = statusRow?.id ?? (await prisma.followUpStatus.findFirst({ where: { code: 'PENDING' } }))?.id;
    if (!statusIdToUse) {
      return res.status(500).json({ success: false, error: 'Aucun statut FollowUp trouvé (exécutez le seed des statuts)' });
    }

    const followup = await prisma.followUp.create({
      data: {
        userId,
        applicationId,
        companyId: application.companyId,
        followUpDate: new Date(dateValue),
        notes: notes || null,
        statusId: statusIdToUse,
        followUpTypeId: req.body.followUpTypeId ?? null,
        followUpMethodId: req.body.followUpMethodId ?? null
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        status: true
      }
    });

    if (contactId) {
      await prisma.followUpContact.create({
        data: { followUpId: followup.id, contactId }
      });
    }

    logger.info(`Relance ${followup.id} créée pour l'utilisateur ${userId}`);

    const followUpDateObj = new Date(dateValue);
    const companyName = followup.application?.company?.name || followup.company?.name || 'Entreprise';
    await createAutoEvent(userId, {
      title: `Relance – ${companyName}`,
      description: `Relance prévue pour la candidature ${followup.application?.position || ''}`,
      startDate: followUpDateObj,
      endDate: new Date(followUpDateObj.getTime() + 1800000),
      applicationId,
      followUpId: followup.id,
      typeCode: 'FOLLOWUP',
      reminderMinutes: 60,
      color: '#F59E0B'
    });

    await updateApplicationStatus(applicationId, 'RELANCED_PENDING', 'Relance planifiée', userId);

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
      const newApplication = await getApplicationForUser(req.body.applicationId, userId);
      if (!newApplication) {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      applicationId = newApplication.id;
      companyId = newApplication.companyId;
    }

    if (req.body.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: req.body.contactId, userId } });
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact non trouvé' });
      }
    }

    const dateValue = req.body.followUpDate || req.body.scheduledDate || req.body.scheduledFor;
    let statusIdToUse = existingFollowup.statusId;
    if (req.body.status) {
      const statusRow = await prisma.followUpStatus.findFirst({ where: { code: sanitizeStatus(req.body.status) } });
      if (statusRow) statusIdToUse = statusRow.id;
    }

    const followup = await prisma.followUp.update({
      where: { id },
      data: {
        applicationId,
        companyId,
        followUpDate: dateValue ? new Date(dateValue) : existingFollowup.followUpDate,
        notes: req.body.notes ?? existingFollowup.notes,
        response: req.body.response ?? existingFollowup.response,
        statusId: statusIdToUse,
        followUpTypeId: req.body.followUpTypeId ?? existingFollowup.followUpTypeId,
        followUpMethodId: req.body.followUpMethodId ?? existingFollowup.followUpMethodId
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        status: true
      }
    });

    if (req.body.contactId) {
      await prisma.followUpContact.deleteMany({ where: { followUpId: id } });
      await prisma.followUpContact.create({
        data: { followUpId: id, contactId: req.body.contactId }
      });
    }

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

    const existingFollowup = await prisma.followUp.findFirst({ where: { id, userId, deletedAt: null } });

    if (!existingFollowup) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée' });
    }

    const now = new Date();
    await prisma.followUp.update({ where: { id }, data: { deletedAt: now } });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = ${now} WHERE "followUpId" = ${id} AND "deletedAt" IS NULL`;
    } catch (e) {
      logger.warn('Cascade soft-delete événements échouée:', e.message);
    }

    logger.info(`Relance ${id} mise à la corbeille par l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Relance déplacée vers la corbeille' });
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

    const statusRow = await prisma.followUpStatus.findFirst({ where: { code: sanitizeStatus(status || 'POSITIVE_RESPONSE') } });
    const statusIdToUse = statusRow?.id ?? existingFollowup.statusId;

    const followup = await prisma.followUp.update({
      where: { id },
      data: {
        response: response || null,
        statusId: statusIdToUse
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true,
        status: true
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

    const pendingStatuses = await prisma.followUpStatus.findMany({ where: { code: { in: ['PENDING', 'PLANNED'] } }, select: { id: true } });
    const pendingStatusIds = pendingStatuses.map((s) => s.id);

    const [total, byStatus, upcoming, overdue] = await Promise.all([
      prisma.followUp.count({ where: { userId } }),
      prisma.followUp.groupBy({
        where: { userId },
        by: ['statusId'],
        _count: true
      }),
      prisma.followUp.count({
        where: {
          userId,
          statusId: { in: pendingStatusIds },
          followUpDate: { gte: new Date() }
        }
      }),
      prisma.followUp.count({
        where: {
          userId,
          statusId: { in: pendingStatusIds },
          followUpDate: { lt: new Date() }
        }
      })
    ]);

    const statusIds = [...new Set(byStatus.map((item) => item.statusId))];
    const statusMap = statusIds.length ? await prisma.followUpStatus.findMany({ where: { id: { in: statusIds } }, select: { id: true, code: true } }).then((rows) => Object.fromEntries(rows.map((r) => [r.id, r.code]))) : {};

    res.json({
      success: true,
      stats: {
        total,
        upcoming,
        overdue,
        byStatus: byStatus.reduce((acc, item) => {
          acc[statusMap[item.statusId] || item.statusId] = item._count;
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
          code: { in: ['CANDIDATE_PENDING', 'NO_RESPONSE', 'FIRST_INTERVIEW_PENDING'] }
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
