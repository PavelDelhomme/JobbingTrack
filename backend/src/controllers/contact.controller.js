const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Récupérer tous les contacts de l'utilisateur
 */
const getContacts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    
    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const contacts = await prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.contact.count({ where });

    res.json({
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des contacts:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * Récupérer un contact par son ID
 */
const getContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    res.json(contact);
  } catch (error) {
    logger.error('Erreur lors de la récupération du contact:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * Créer un nouveau contact
 */
const createContact = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, companyId, position, notes, linkedinUrl } = req.body;

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyId,
        position,
        notes,
        linkedinUrl,
        userId: req.user.id
      }
    });

    logger.info(`Contact créé: ${contact.firstName} ${contact.lastName}`);
    res.status(201).json(contact);
  } catch (error) {
    logger.error('Erreur lors de la création du contact:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * Mettre à jour un contact
 */
const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, companyId, position, notes, linkedinUrl } = req.body;

    // Vérifier que le contact appartient à l'utilisateur
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyId,
        position,
        notes,
        linkedinUrl,
        updatedAt: new Date()
      }
    });

    logger.info(`Contact mis à jour: ${contact.firstName} ${contact.lastName}`);
    res.json(contact);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du contact:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * Supprimer un contact
 */
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le contact appartient à l'utilisateur
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }

    await prisma.contact.delete({
      where: { id }
    });

    logger.info(`Contact supprimé: ${existingContact.firstName} ${existingContact.lastName}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du contact:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact
};
