const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const createCompany = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non identifié (token invalide ou absent)'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, website, industry, size, location, description, companyType } = req.body;

    const VALID_SIZES = ['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];
    const sizeValue = size && VALID_SIZES.includes(String(size).toUpperCase())
      ? String(size).toUpperCase()
      : undefined;

    const data = {
      userId: req.user.id,
      name: name && String(name).trim() ? String(name).trim() : 'Sans nom',
      companyType: companyType === 'TEMP_AGENCY' ? 'TEMP_AGENCY' : 'EMPLOYER',
    };
    if (website !== undefined && website !== null && website !== '') data.website = String(website);
    if (industry !== undefined && industry !== null && industry !== '') data.industry = String(industry);
    if (sizeValue) data.size = sizeValue;
    if (location !== undefined && location !== null && location !== '') data.location = String(location);
    if (description !== undefined && description !== null && description !== '') data.description = String(description);

    const company = await prisma.company.create({
      data,
    });

    res.status(201).json({
      success: true,
      message: 'Entreprise créée',
      company
    });

    logger.info(`Entreprise créée: ${company.name}`);
  } catch (error) {
    logger.error('Erreur création entreprise:', error);
    // P2003 = foreign key violation (ex. userId n'existe pas dans User)
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Utilisateur non trouvé en base. Vérifiez que le token correspond à un utilisateur existant.'
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Une entreprise avec ce nom existe déjà pour cet utilisateur.'
      });
    }
    const message = error.meta?.message || error.message || 'Erreur lors de la création de l\'entreprise.';
    const status = error.code ? 400 : 500;
    return res.status(status).json({
      success: false,
      message,
      code: error.code,
      ...(process.env.NODE_ENV !== 'production' && { debug: String(error) })
    });
  }
};

const getCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {
      userId: req.user.id,
      deletedAt: null,
      isArchived: false,
      ...(req.query.companyType === 'TEMP_AGENCY' ? { companyType: 'TEMP_AGENCY' } : req.query.companyType === 'EMPLOYER' ? { companyType: 'EMPLOYER' } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };

    let companies, total;
    try {
      [companies, total] = await Promise.all([
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
    } catch (error) {
      // Fallback si table Company n'existe pas (P2021) - Mode développement
      const isTableError = error.code === 'P2021' || 
                          error.code === 'P2022' ||
                          (error.message && (
                            error.message.includes('does not exist') || 
                            error.message.includes('Table') || 
                            error.message.includes('relation') && error.message.includes('does not exist')
                          ));
      
      if (isTableError && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Company non trouvée, retour de données vides (mode développement)');
        logger.warn(`   Code erreur: ${error.code}, Message: ${error.message}`);
        companies = [];
        total = 0;
      } else {
        logger.error('Erreur récupération entreprises:', error);
        throw error; // Re-throw pour que le catch externe le gère
      }
    }

    res.json({
      success: true,
      companies: companies || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        pages: Math.ceil((total || 0) / limit)
      },
      ...(total === 0 && (!companies || companies.length === 0) ? {
        warning: 'Table Company non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      } : {})
    });
  } catch (error) {
    // Si l'erreur n'a pas été gérée par le try-catch interne
    const isTableError = error.code === 'P2021' || 
                        error.code === 'P2022' ||
                        (error.message && (
                          error.message.includes('does not exist') || 
                          error.message.includes('Table') || 
                          error.message.includes('relation') && error.message.includes('does not exist')
                        ));
    
    if (isTableError && process.env.NODE_ENV !== 'production') {
      logger.warn('Table Company non trouvée, retour de données vides (mode développement)');
      logger.warn(`   Code erreur: ${error.code}, Message: ${error.message}`);
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
    const userId = req.user?.id;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        applications: {
          where: userId ? { userId } : undefined,
          orderBy: { createdAt: 'desc' }
        },
        contacts: {
          include: { contact: true },
          ...(userId
            ? { where: { contact: { userId } } }
            : {}),
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
    const body = req.body;

    // Champs autorisés (répercussion automatique via relations Prisma)
    const allowed = [
      'name', 'website', 'industry', 'size', 'companyType', 'location',
      'address', 'city', 'postalCode', 'country', 'logoUrl', 'description'
    ];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun champ à mettre à jour'
      });
    }

    // Récupérer l'entreprise avant mise à jour pour logging
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

    const company = await prisma.company.update({
      where: { id },
      data: updateData
    });

    if (updateData.name && updateData.name !== oldCompany.name) {
      logger.info(`🏢 Entreprise renommée: "${oldCompany.name}" → "${updateData.name}"`);
      logger.info(`   ↳ Impact: ${oldCompany._count.applications} candidatures, ${oldCompany._count.contacts} contacts`);
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

    const existingCompany = await prisma.company.findFirst({
      where: { id, userId: req.user.id, deletedAt: null }
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    logger.info(`Entreprise ${id} mise à la corbeille par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Entreprise déplacée vers la corbeille'
    });
  } catch (error) {
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
