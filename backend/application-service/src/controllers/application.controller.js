const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const companyService = require('../services/company.service');

const prisma = new PrismaClient();

// CREATE - Créer une candidature
const createApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { 
      companyId,  // Peut être fourni directement
      companyName,  // ✅ NOUVEAU - Ou on peut fournir juste le nom
      companyData,  // ✅ NOUVEAU - Données supplémentaires de l'entreprise
      position, 
      description, 
      location, 
      type = 'FULL_TIME',
      salary,
      status = 'DRAFT',
      applicationDate,
      source,
      jobUrl,
      notes
    } = req.body;

    // ✅ LOGIQUE INTELLIGENTE : Gérer automatiquement l'entreprise
    let finalCompanyId = companyId;

    // Si un nom d'entreprise est fourni au lieu d'un ID
    if (companyName && !companyId) {
      logger.info(`🏢 Gestion automatique entreprise: ${companyName}`);
      
      finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );

      logger.info(`✅ Entreprise traitée - ID: ${finalCompanyId}`);
    }

    // Vérifier qu'on a bien un companyId
    if (!finalCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId ou companyName requis'
      });
    }

    const application = await prisma.application.create({
      data: {
        userId: req.user.id,
        companyId: finalCompanyId,
        position,
        description,
        location,
        type,
        salary,
        status,
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        source,
        jobUrl,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Candidature créée avec succès',
      application
    });

    logger.info(`Candidature créée: ${application.id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur création candidature:', error);
    next(error);
  }
};

// READ - Lister les candidatures
const getApplications = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    
    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(search && {
        position: { contains: search, mode: 'insensitive' }
      })
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          company: true,
          _count: {
            select: {
              interviews: true,
              followUps: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.application.count({ where })
    ]);

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération candidatures:', error);
    next(error);
  }
};

// READ - Une candidature
const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        company: true,
        interviews: {
          orderBy: { scheduledAt: 'asc' }
        },
        followUps: {
          orderBy: { scheduledDate: 'desc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    logger.error('Erreur récupération candidature:', error);
    next(error);
  }
};

// UPDATE
const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, companyData, ...updateData } = req.body;

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    // ✅ LOGIQUE INTELLIGENTE : Gérer automatiquement l'entreprise si nom fourni
    if (companyName && companyName !== '') {
      logger.info(`🏢 Mise à jour automatique entreprise: ${companyName}`);
      
      const finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );

      updateData.companyId = finalCompanyId;
      logger.info(`✅ Entreprise traitée - ID: ${finalCompanyId}`);
    }

    const application = await prisma.application.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Candidature mise à jour',
      application
    });

    logger.info(`Candidature mise à jour: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur mise à jour candidature:', error);
    next(error);
  }
};

// DELETE
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    await prisma.application.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Candidature supprimée'
    });

    logger.info(`Candidature supprimée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Application Service opérationnel',
    service: 'application-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  getHealth
};
