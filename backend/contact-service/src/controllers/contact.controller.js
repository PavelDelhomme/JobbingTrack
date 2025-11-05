const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// CREATE
const createContact = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.user.id,
        ...req.body
      }
    });

    res.status(201).json({
      success: true,
      message: 'Contact créé',
      contact
    });

    logger.info(`Contact créé: ${contact.id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur création contact:', error);
    next(error);
  }
};

// READ - Liste
const getContacts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit)
      }),
      prisma.contact.count({ where })
    ]);

    res.json({
      success: true,
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération contacts:', error);
    next(error);
  }
};

// READ - Un contact
const getContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    res.json({
      success: true,
      contact
    });
  } catch (error) {
    logger.error('Erreur récupération contact:', error);
    next(error);
  }
};

// UPDATE
const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: req.body
    });

    res.json({
      success: true,
      message: 'Contact mis à jour',
      contact
    });

    logger.info(`Contact mis à jour: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur mise à jour contact:', error);
    next(error);
  }
};

// DELETE
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    await prisma.contact.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Contact supprimé'
    });

    logger.info(`Contact supprimé: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression contact:', error);
    next(error);
  }
};

// NOUVEAU - Lier un contact à une entreprise
const linkContactToCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'CompanyId requis'
      });
    }

    // Vérifier que le contact existe et appartient à l'utilisateur
    const contact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    // Vérifier que l'entreprise existe
    const company = await prisma.company.findFirst({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    // Créer la liaison
    const contactCompany = await prisma.contactCompany.upsert({
      where: {
        contactId_companyId: {
          contactId: id,
          companyId: companyId
        }
      },
      update: {},
      create: {
        contactId: id,
        companyId: companyId
      }
    });

    res.json({
      success: true,
      message: 'Contact lié à l\'entreprise',
      data: contactCompany
    });

    logger.info(`Contact ${id} lié à l'entreprise ${companyId} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur liaison contact-entreprise:', error);
    next(error);
  }
};

// NOUVEAU - Lier un contact à une candidature
const linkContactToApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'ApplicationId requis'
      });
    }

    // Vérifier que le contact existe et appartient à l'utilisateur
    const contact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    // Vérifier que la candidature existe et appartient à l'utilisateur
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId: req.user.id
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    // Créer la liaison
    const contactApplication = await prisma.contactApplication.upsert({
      where: {
        contactId_applicationId: {
          contactId: id,
          applicationId: applicationId
        }
      },
      update: {},
      create: {
        contactId: id,
        applicationId: applicationId
      }
    });

    res.json({
      success: true,
      message: 'Contact lié à la candidature',
      data: contactApplication
    });

    logger.info(`Contact ${id} lié à la candidature ${applicationId} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur liaison contact-candidature:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir les contacts d'une entreprise
const getContactsByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    // Vérifier que l'entreprise existe
    const company = await prisma.company.findFirst({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: req.user.id,
        contactCompanies: {
          some: {
            companyId: companyId
          }
        }
      },
      include: {
        companies: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      contacts,
      total: contacts.length
    });
  } catch (error) {
    logger.error('Erreur récupération contacts par entreprise:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir les contacts d'une candidature
const getContactsByApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    // Vérifier que la candidature existe et appartient à l'utilisateur
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId: req.user.id
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: req.user.id,
        contactApplications: {
          some: {
            applicationId: applicationId
          }
        }
      },
      include: {
        companies: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      contacts,
      total: contacts.length
    });
  } catch (error) {
    logger.error('Erreur récupération contacts par candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des contacts opérationnel',
    service: 'contact-service',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  linkContactToCompany,
  linkContactToApplication,
  getContactsByCompany,
  getContactsByApplication,
  getHealth
};
