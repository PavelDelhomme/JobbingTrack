const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

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
          where: { userId },
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
        prisma.interview.count({ where: { userId } })
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
      where: { id, userId },
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

    logger.info(`Entretien ${id} mis à jour par ${userId}`);

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

    const existingInterview = await prisma.interview.findFirst({ where: { id, userId } });

    if (!existingInterview) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé' });
    }

    await prisma.interview.delete({ where: { id } });

    logger.info(`Entretien ${id} supprimé pour l'utilisateur ${userId}`);

    res.json({ success: true, message: 'Entretien supprimé' });
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
