const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// CREATE
const createInterview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: req.body.applicationId,
        type: req.body.type,
        scheduledAt: new Date(req.body.scheduledAt),
        duration: req.body.duration,
        location: req.body.location,
        meetingUrl: req.body.meetingUrl,
        interviewer: req.body.interviewer,
        notes: req.body.notes,
        status: req.body.status || 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Entretien créé',
      interview
    });

    logger.info(`Entretien créé: ${interview.id}`);
  } catch (error) {
    logger.error('Erreur création entretien:', error);
    next(error);
  }
};

// READ - Liste
const getInterviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        include: {
          application: {
            include: {
              company: true
            }
          }
        },
        orderBy: { scheduledAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.interview.count()
    ]);

    res.json({
      success: true,
      interviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération entretiens:', error);
    next(error);
  }
};

// READ - Un entretien
const getInterview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            company: true
          }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Entretien non trouvé'
      });
    }

    res.json({
      success: true,
      interview
    });
  } catch (error) {
    logger.error('Erreur récupération entretien:', error);
    next(error);
  }
};

// UPDATE
const updateInterview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const interview = await prisma.interview.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      message: 'Entretien mis à jour',
      interview
    });

    logger.info(`Entretien mis à jour: ${id}`);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Entretien non trouvé'
      });
    }
    logger.error('Erreur mise à jour entretien:', error);
    next(error);
  }
};

// DELETE
const deleteInterview = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.interview.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Entretien supprimé'
    });

    logger.info(`Entretien supprimé: ${id}`);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Entretien non trouvé'
      });
    }
    logger.error('Erreur suppression entretien:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des entretiens opérationnel',
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
