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

    const { companyId, applicationId, ...contactData } = req.body || {};
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non identifié (userId manquant)'
      });
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        ...contactData
      }
    });

    if (companyId) {
      try {
        await prisma.contactCompany.upsert({
          where: {
            contactId_companyId: { contactId: contact.id, companyId }
          },
          update: {},
          create: { contactId: contact.id, companyId }
        });
      } catch (linkErr) {
        logger.warn(`Contact créé mais liaison entreprise ignorée (companyId invalide?): ${linkErr.message}`);
      }
    }

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
      deletedAt: null,
      isArchived: false,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    let contacts, total;
    try {
      [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.contact.count({ where })
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
        logger.warn('Table Contact ou colonne manquante, retour de données vides (mode développement)');
        logger.warn(`   Code erreur: ${error.code}, Message: ${error.message}`);
        contacts = [];
        total = 0;
      } else {
        logger.error('Erreur récupération contacts:', {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        return next(error);
      }
    }

    res.json({
      success: true,
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      ...(total === 0 && contacts.length === 0 ? {
        warning: 'Table Contact non trouvée. Exécutez "make db-push-all" pour créer les tables.'
      } : {})
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
        userId: req.user.id,
        deletedAt: null,
        isArchived: false
      },
      include: {
        companies: {
          include: { company: true }
        },
        applications: {
          include: {
            application: {
              include: { company: true }
            }
          }
        }
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
    const body = req.body;

    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    const allowed = ['firstName', 'lastName', 'position', 'email', 'phone', 'linkedinUrl', 'notes'];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData
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

// DELETE (soft delete → corbeille)
const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id, deletedAt: null }
    });

    if (!existingContact) {
      return res.status(404).json({
        success: false,
        error: 'Contact non trouvé'
      });
    }

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Contact déplacé vers la corbeille'
    });

    logger.info(`Contact ${id} mis à la corbeille par ${req.user.email}`);
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
        deletedAt: null,
        isArchived: false,
        companies: {
          some: {
            companyId: companyId
          }
        }
      },
      include: {
        companies: {
          include: { company: true }
        }
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
        applications: {
          some: {
            applicationId: applicationId
          }
        }
      },
      include: {
        companies: {
          include: { company: true }
        }
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
