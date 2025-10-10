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
        include: {
          company: true
        },
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
      },
      include: {
        company: true
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
  getHealth
};
