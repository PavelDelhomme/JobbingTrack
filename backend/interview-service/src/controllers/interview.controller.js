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
    const app = await prisma.application.findUnique({ where: { id: applicationId }, select: { statusId: true, userId: true, statusEngineOptOut: true } });
    if (!app || app.statusId === statusRow.id) return;
    if (app.statusEngineOptOut === true) {
      logger.info(`Cascade ignorée pour candidature ${applicationId} (statusEngineOptOut=true)`);
      return;
    }
    if (!userId && app.userId) {
      const autoEnabled = await isAutoStatusEnabled(app.userId);
      if (!autoEnabled) {
        logger.info(`Auto-statut désactivé pour user ${app.userId}, cascade ignorée (${statusCode})`);
        return;
      }
    }
    await prisma.applicationStatusHistory.create({
      data: { applicationId, previousStatusId: app.statusId || null, newStatusId: statusRow.id, comment }
    });
    await prisma.application.update({ where: { id: applicationId }, data: { statusId: statusRow.id } });
    logger.info(`Statut candidature ${applicationId} mis à jour → ${statusCode}`);
  } catch (e) {
    logger.warn(`Cascade statut candidature échouée (${statusCode}):`, e.message);
  }
}

async function createAutoEvent(userId, data) {
  try {
    const eventType = await prisma.eventType.findFirst({ where: { code: data.typeCode || 'INTERVIEW' } })
      ?? await prisma.eventType.findFirst();
    await prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate || new Date(data.startDate.getTime() + 3600000),
        allDay: false,
        reminderEnabled: true,
        reminderMinutes: data.reminderMinutes || 30,
        applicationId: data.applicationId || null,
        interviewId: data.interviewId || null,
        eventTypeId: eventType?.id || null,
        color: data.color || '#3B82F6'
      }
    });
    logger.info(`Événement auto créé: ${data.title}`);
  } catch (e) {
    logger.warn('Auto-création événement échouée:', e.message);
  }
}

const mapInterviewResponse = (interview) => ({
  ...interview,
  interviewDate: interview.interviewDate?.toISOString(),
  createdAt: interview.createdAt?.toISOString(),
  updatedAt: interview.updatedAt?.toISOString()
});

// Récupère une candidature par id (raw d'abord pour éviter erreur colonne isArchived/archived en BDD)
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

const createInterview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const { applicationId } = req.body;
    const application = await getApplicationForUser(applicationId, userId);

    if (!application) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }

    const interviewDate = req.body.interviewDate || req.body.scheduledAt;
    const statusCode = (req.body.status || 'SCHEDULED').toUpperCase();
    const statusRow = await prisma.interviewStatus.findFirst({ where: { code: statusCode } })
      ?? await prisma.interviewStatus.findFirst();
    const statusId = statusRow?.id;
    if (!statusId) {
      return res.status(400).json({ success: false, error: 'Aucun statut Interview trouvé en BDD. Exécutez make db-push-all.' });
    }

    const interview = await prisma.interview.create({
      data: {
        userId,
        applicationId,
        companyId: application.companyId,
        interviewDate: new Date(interviewDate),
        estimatedDuration: req.body.estimatedDuration ? parseInt(req.body.estimatedDuration, 10) : null,
        location: req.body.location || null,
        videoLink: req.body.videoLink || null,
        notes: req.body.notes || null,
        statusId
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    logger.info(`Entretien ${interview.id} créé pour l'utilisateur ${userId}`);

    await updateApplicationStatus(applicationId, 'INTERVIEW_PENDING', 'Entretien programmé automatiquement', userId);

    const interviewDateObj = new Date(interviewDate);
    const companyName = interview.application?.company?.name || interview.company?.name || 'Entreprise';
    await createAutoEvent(userId, {
      title: `Entretien – ${companyName}`,
      description: `Entretien prévu pour la candidature ${interview.application?.position || ''}`,
      startDate: interviewDateObj,
      endDate: req.body.estimatedDuration
        ? new Date(interviewDateObj.getTime() + parseInt(req.body.estimatedDuration, 10) * 60000)
        : new Date(interviewDateObj.getTime() + 3600000),
      applicationId,
      interviewId: interview.id,
      typeCode: 'INTERVIEW',
      reminderMinutes: 30,
      color: '#3B82F6'
    });

    res.status(201).json({
      success: true,
      interview: mapInterviewResponse(interview)
    });
  } catch (error) {
    logger.error('Erreur création entretien:', error);
    next(error);
  }
};

const getInterviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let interviews, total;
    try {
      [interviews, total] = await Promise.all([
        prisma.interview.findMany({
          where: { userId, deletedAt: null, isArchived: false },
          include: {
            application: {
              include: {
                company: true
              }
            },
            company: true
          },
          orderBy: { interviewDate: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.interview.count({ where: { userId, deletedAt: null, isArchived: false } })
      ]);
    } catch (error) {
      // ✅ CORRECTION : Gérer les erreurs de colonne manquante (deletedAt, etc.)
      const isTableError = error.code === 'P2021' || 
                          error.code === 'P2022' ||
                          (error.message && (
                            error.message.includes('does not exist') || 
                            error.message.includes('column') && error.message.includes('does not exist') ||
                            error.message.includes('deletedAt')
                          ));
      
      if (isTableError && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Interview ou colonne manquante, retour de données vides (mode développement)');
        logger.warn(`   Code erreur: ${error.code}, Message: ${error.message}`);
        interviews = [];
        total = 0;
      } else {
        logger.error('Erreur récupération entretiens:', {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        return next(error);
      }
    }

    res.json({
      success: true,
      interviews: interviews.map(mapInterviewResponse),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      ...(total === 0 && interviews.length === 0 ? {
        warning: 'Table Interview non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      } : {})
    });
  } catch (error) {
    logger.error('Erreur récupération entretiens:', error);
    next(error);
  }
};

const getInterview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const interview = await prisma.interview.findFirst({
      where: { id, userId, deletedAt: null, isArchived: false },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    if (!interview) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé' });
    }

    res.json({ success: true, interview: mapInterviewResponse(interview) });
  } catch (error) {
    logger.error('Erreur récupération entretien:', error);
    next(error);
  }
};

const updateInterview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingInterview = await prisma.interview.findFirst({
      where: { id, userId },
      include: { application: true }
    });

    if (!existingInterview) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé' });
    }

    let companyId = existingInterview.companyId;
    if (req.body.applicationId && req.body.applicationId !== existingInterview.applicationId) {
      const newApplication = await getApplicationForUser(req.body.applicationId, userId);
      if (!newApplication) {
        return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
      }
      companyId = newApplication.companyId;
    }

    const interviewDate = req.body.interviewDate || req.body.scheduledAt;

    let statusId = existingInterview.statusId;
    if (req.body.statusId) {
      statusId = req.body.statusId;
    } else if (req.body.status) {
      const statusRow = await prisma.interviewStatus.findFirst({
        where: { code: req.body.status.toUpperCase() }
      });
      if (statusRow) statusId = statusRow.id;
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: {
        applicationId: req.body.applicationId || existingInterview.applicationId,
        companyId,
        interviewDate: interviewDate ? new Date(interviewDate) : existingInterview.interviewDate,
        estimatedDuration: req.body.estimatedDuration !== undefined
          ? parseInt(req.body.estimatedDuration, 10)
          : existingInterview.estimatedDuration,
        location: req.body.location ?? existingInterview.location,
        videoLink: req.body.videoLink ?? existingInterview.videoLink,
        notes: req.body.notes ?? existingInterview.notes,
        statusId,
        feedbackExpectedFrom: req.body.feedbackExpectedFrom != null ? new Date(req.body.feedbackExpectedFrom) : existingInterview.feedbackExpectedFrom,
        feedbackExpectedTo: req.body.feedbackExpectedTo != null ? new Date(req.body.feedbackExpectedTo) : existingInterview.feedbackExpectedTo,
        feedbackReceived: req.body.feedbackReceived !== undefined ? Boolean(req.body.feedbackReceived) : existingInterview.feedbackReceived,
        outcome: req.body.outcome != null ? req.body.outcome.toUpperCase() : existingInterview.outcome,
        interviewTypeId: req.body.interviewTypeId ?? existingInterview.interviewTypeId,
        interviewStyleId: req.body.interviewStyleId ?? existingInterview.interviewStyleId
      },
      include: {
        application: {
          include: {
            company: true
          }
        },
        company: true
      }
    });

    logger.info(`Entretien ${id} mis à jour par ${userId}`);

    if (statusId !== existingInterview.statusId) {
      const newStatus = await prisma.interviewStatus.findUnique({ where: { id: statusId } });
      if (newStatus) {
        const code = newStatus.code?.toUpperCase();
        if (code === 'COMPLETED') {
          await updateApplicationStatus(
            interview.applicationId || existingInterview.applicationId,
            'INTERVIEW_DONE',
            'Entretien terminé',
            userId
          );
        } else if (code === 'CANCELLED') {
          await updateApplicationStatus(
            interview.applicationId || existingInterview.applicationId,
            'CANDIDATE_PENDING',
            'Entretien annulé',
            userId
          );
        }
      }
    }

    if (req.body.outcome) {
      const outcome = req.body.outcome.toUpperCase();
      if (outcome === 'POSITIVE') {
        await updateApplicationStatus(
          interview.applicationId || existingInterview.applicationId,
          'OFFER_RECEIVED',
          'Résultat entretien positif',
          userId
        );
      } else if (outcome === 'NEGATIVE') {
        await updateApplicationStatus(
          interview.applicationId || existingInterview.applicationId,
          'REJECTED',
          'Résultat entretien négatif',
          userId
        );
      }
    }

    res.json({ success: true, interview: mapInterviewResponse(interview) });
  } catch (error) {
    logger.error('Erreur mise à jour entretien:', error);
    next(error);
  }
};

const deleteInterview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingInterview = await prisma.interview.findFirst({ where: { id, userId, deletedAt: null } });

    if (!existingInterview) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé' });
    }

    const now = new Date();
    await prisma.interview.update({ where: { id }, data: { deletedAt: now } });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = ${now} WHERE "interviewId" = ${id} AND "deletedAt" IS NULL`;
    } catch (e) {
      logger.warn('Cascade soft-delete événements échouée:', e.message);
    }

    logger.info(`Entretien ${id} mis à la corbeille par l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Entretien déplacé vers la corbeille' });
  } catch (error) {
    logger.error('Erreur suppression entretien:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des entretiens opérationnelle',
    service: 'interview-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createInterview,
  getInterviews,
  getInterview,
  updateInterview,
  deleteInterview,
  getHealth
};
