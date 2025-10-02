const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getApplications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      status,
      companyId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const where = { userId };
    
    if (status) {
      where.status = status;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (search) {
      where.OR = [
        { position: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          company: true,
          interviews: {
            orderBy: { scheduledAt: 'asc' }
          },
          _count: {
            select: {
              documents: true,
              activities: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.application.count({ where })
    ]);

    res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des candidatures:', error);
    next(error);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId
      },
      include: {
        company: true,
        interviews: {
          orderBy: { scheduledAt: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        error: 'Candidature non trouvée'
      });
    }

    res.json(application);
  } catch (error) {
    logger.error('Erreur lors de la récupération de la candidature:', error);
    next(error);
  }
};

const createApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      companyName,
      companyWebsite,
      companyIndustry,
      position,
      description,
      location,
      type,
      salary,
      status = 'DRAFT',
      applicationDate,
      source,
      jobUrl,
      notes
    } = req.body;

    let company = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { equals: companyName, mode: 'insensitive' } },
          companyWebsite ? { website: companyWebsite } : {}
        ]
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          website: companyWebsite,
          industry: companyIndustry
        }
      });
    }

    const application = await prisma.application.create({
      data: {
        userId,
        companyId: company.id,
        position,
        description,
        location,
        type,
        salary,
        status,
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        source,
        jobUrl,
        notes,
        activities: {
          create: {
            type: 'APPLICATION_CREATED',
            description: `Candidature créée pour le poste de ${position} chez ${company.name}`
          }
        }
      },
      include: {
        company: true
      }
    });

    logger.info(`Nouvelle candidature créée: ${application.id} par ${userId}`);

    res.status(201).json({
      message: 'Candidature créée avec succès',
      application
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la candidature:', error);
    next(error);
  }
};

const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!existingApplication) {
      return res.status(404).json({
        error: 'Candidature non trouvée'
      });
    }

    const activities = [];
    if (updateData.status && updateData.status !== existingApplication.status) {
      activities.push({
        type: 'STATUS_CHANGED',
        description: `Statut changé de ${existingApplication.status} à ${updateData.status}`,
        metadata: {
          oldStatus: existingApplication.status,
          newStatus: updateData.status
        }
      });
    }

    const application = await prisma.application.update({
      where: { id },
      data: {
        ...updateData,
        activities: activities.length > 0 ? { create: activities } : undefined
      },
      include: {
        company: true,
        interviews: true,
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    logger.info(`Candidature mise à jour: ${id} par ${userId}`);

    res.json({
      message: 'Candidature mise à jour avec succès',
      application
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la candidature:', error);
    next(error);
  }
};

const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await prisma.application.findFirst({
      where: { id, userId }
    });

    if (!application) {
      return res.status(404).json({
        error: 'Candidature non trouvée'
      });
    }

    await prisma.application.delete({
      where: { id }
    });

    logger.info(`Candidature supprimée: ${id} par ${userId}`);

    res.json({
      message: 'Candidature supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la candidature:', error);
    next(error);
  }
};

const getApplicationStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const where = { userId };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const statusStats = await prisma.application.groupBy({
      by: ['status'],
      where,
      _count: true
    });

    const total = await prisma.application.count({ where });

    const thisMonth = await prisma.application.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    const withResponse = await prisma.application.count({
      where: {
        userId,
        status: {
          in: ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED']
        }
      }
    });

    const responseRate = total > 0 ? (withResponse / total * 100).toFixed(1) : 0;

    res.json({
      total,
      thisMonth,
      responseRate: parseFloat(responseRate),
      byStatus: statusStats.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    next(error);
  }
};

module.exports = {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationStats
};
