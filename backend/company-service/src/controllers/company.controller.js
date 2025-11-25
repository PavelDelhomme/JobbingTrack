const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const createCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, website, industry, size, location, description } = req.body;

    const company = await prisma.company.create({
      data: {
        userId: req.user.id,
        name,
        website,
        industry,
        size,
        location,
        description
      }
    });

    res.status(201).json({
      success: true,
      message: 'Entreprise créée',
      company
    });

    logger.info(`Entreprise créée: ${company.name}`);
  } catch (error) {
    logger.error('Erreur création entreprise:', error);
    next(error);
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {
      userId: req.user.id,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              applications: true,
              contacts: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.company.count({ where })
    ]);

    res.json({
      success: true,
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // Fallback si table Company n'existe pas (P2021) - Mode développement
    if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
      logger.warn('Table Company non trouvée, retour de données vides (mode développement)');
      return res.json({
        success: true,
        companies: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        },
        warning: 'Table Company non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      });
    }
    logger.error('Erreur récupération entreprises:', error);
    next(error);
  }
};

const getCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        applications: {
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' }
        },
        contacts: {
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    res.json({
      success: true,
      company
    });
  } catch (error) {
    logger.error('Erreur récupération entreprise:', error);
    next(error);
  }
};

// ✅ NOUVEAU - Récupérer une entreprise par nom
const getCompanyByName = async (req, res, next) => {
  try {
    const { name } = req.params;

    const company = await prisma.company.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    res.json({
      success: true,
      company
    });
  } catch (error) {
    logger.error('Erreur récupération entreprise par nom:', error);
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ✅ Récupérer l'entreprise avant mise à jour pour logging
    const oldCompany = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            applications: true,
            contacts: true
          }
        }
      }
    });

    if (!oldCompany) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    // ✅ Mettre à jour l'entreprise
    const company = await prisma.company.update({
      where: { id },
      data: updateData
    });

    // ✅ Logger les changements importants (notamment le renommage)
    if (updateData.name && updateData.name !== oldCompany.name) {
      logger.info(`🏢 Entreprise renommée: "${oldCompany.name}" → "${updateData.name}"`);
      logger.info(`   ↳ Impact: ${oldCompany._count.applications} candidatures, ${oldCompany._count.contacts} contacts`);
      logger.info(`   ℹ️  Les relations Prisma synchronisent automatiquement le nom via les JOINs`);
    }

    res.json({
      success: true,
      message: 'Entreprise mise à jour',
      company,
      impactedEntities: {
        applications: oldCompany._count.applications,
        contacts: oldCompany._count.contacts
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }
    logger.error('Erreur mise à jour entreprise:', error);
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.company.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Entreprise supprimée'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }
    logger.error('Erreur suppression entreprise:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Company Service opérationnel',
    service: 'company-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createCompany,
  getCompanies,
  getCompany,
  getCompanyByName,
  updateCompany,
  deleteCompany,
  getHealth
};
