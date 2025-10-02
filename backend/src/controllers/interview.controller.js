// backend/src/controllers/interview.controller.js
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getInterviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { applicationId, status, upcoming } = req.query;

    const where = {
      application: { userId }
    };

    if (applicationId) where.applicationId = applicationId;
    if (status) where.status = status;
    
    if (upcoming === 'true') {
      where.scheduledAt = { gte: new Date() };
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        application: {
          include: { company: true }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(interviews);
  } catch (error) {
    logger.error('Erreur récupération entretiens:', error);
    next(error);
  }
};

const createInterview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      applicationId,
      type,
      scheduledAt,
      duration,
      location,
      meetingUrl,
      interviewer,
      notes
    } = req.body;

    // Vérifier que l'application appartient à l'utilisateur
    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId }
    });

    if (!application) {
      return res.status(404).json({ error: 'Candidature non trouvée' });
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId,
        type,
        scheduledAt: new Date(scheduledAt),
        duration,
        location,
        meetingUrl,
        interviewer,
        notes
      },
      include: {
        application: {
          include: { company: true }
        }
      }
    });

    // Mettre à jour le statut de la candidature
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'INTERVIEW_SCHEDULED',
        activities: {
          create: {
            type: 'INTERVIEW_SCHEDULED',
            description: `Entretien ${type} programmé le ${new Date(scheduledAt).toLocaleDateString('fr-FR')}`
          }
        }
      }
    });

    logger.info(`Entretien créé: ${interview.id} pour la candidature ${applicationId}`);
    
    res.status(201).json({
      message: 'Entretien programmé avec succès',
      interview
    });
  } catch (error) {
    logger.error('Erreur création entretien:', error);
    next(error);
  }
};

const updateInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Vérifier que l'entretien appartient à l'utilisateur
    const existingInterview = await prisma.interview.findFirst({
      where: {
        id,
        application: { userId }
      }
    });

    if (!existingInterview) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        application: {
          include: { company: true }
        }
      }
    });

    // Si l'entretien est marqué comme terminé, mettre à jour la candidature
    if (updateData.status === 'COMPLETED') {
      await prisma.application.update({
        where: { id: interview.applicationId },
        data: {
          status: 'INTERVIEWED',
          activities: {
            create: {
              type: 'INTERVIEW_COMPLETED',
              description: `Entretien ${interview.type} terminé`
            }
          }
        }
      });
    }

    res.json({
      message: 'Entretien mis à jour avec succès',
      interview
    });
  } catch (error) {
    logger.error('Erreur mise à jour entretien:', error);
    next(error);
  }
};

module.exports = {
  getInterviews,
  createInterview,
  updateInterview
};