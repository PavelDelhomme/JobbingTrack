// backend/src/controllers/company.controller.js
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getCompanies = async (req, res, next) => {
  try {
    const { search, industry, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (industry) {
      where.industry = industry;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

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
        skip,
        take
      }),
      prisma.company.count({ where })
    ]);

    res.json({
      companies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Erreur récupération entreprises:', error);
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const company = await prisma.company.create({
      data: req.body,
      include: {
        _count: {
          select: {
            applications: true,
            contacts: true
          }
        }
      }
    });

    logger.info(`Nouvelle entreprise créée: ${company.id} - ${company.name}`);
    
    res.status(201).json({
      message: 'Entreprise créée avec succès',
      company
    });
  } catch (error) {
    logger.error('Erreur création entreprise:', error);
    next(error);
  }
};

module.exports = {
  getCompanies,
  getCompany: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          applications: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          contacts: true,
          _count: {
            select: {
              applications: true,
              contacts: true
            }
          }
        }
      });

      if (!company) {
        return res.status(404).json({ error: 'Entreprise non trouvée' });
      }

      res.json(company);
    } catch (error) {
      logger.error('Erreur récupération entreprise:', error);
      next(error);
    }
  },
  createCompany,
  updateCompany: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const company = await prisma.company.update({
        where: { id },
        data: req.body,
        include: {
          _count: {
            select: {
              applications: true,
              contacts: true
            }
          }
        }
      });

      res.json({
        message: 'Entreprise mise à jour avec succès',
        company
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Entreprise non trouvée' });
      }
      logger.error('Erreur mise à jour entreprise:', error);
      next(error);
    }
  },
  deleteCompany: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Vérifier s'il y a des candidatures associées
      const applicationsCount = await prisma.application.count({
        where: { companyId: id }
      });

      if (applicationsCount > 0) {
        return res.status(400).json({
          error: 'Impossible de supprimer une entreprise avec des candidatures associées'
        });
      }

      await prisma.company.delete({
        where: { id }
      });

      res.json({
        message: 'Entreprise supprimée avec succès'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Entreprise non trouvée' });
      }
      logger.error('Erreur suppression entreprise:', error);
      next(error);
    }
  },
  getCompanyApplications: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const applications = await prisma.application.findMany({
        where: {
          companyId: id,
          userId
        },
        include: {
          interviews: {
            orderBy: { scheduledAt: 'desc' }
          },
          _count: {
            select: {
              documents: true,
              activities: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(applications);
    } catch (error) {
      logger.error('Erreur récupération candidatures entreprise:', error);
      next(error);
    }
  }
};