const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.contact.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille contacts:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.contact.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Contact non trouvé dans la corbeille' });
    }

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: null }
    });

    logger.info(`Contact ${id} restauré depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Contact restauré avec succès' });
  } catch (error) {
    logger.error('Erreur restauration contact:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.contact.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Contact non trouvé dans la corbeille' });
    }

    await prisma.contact.delete({ where: { id } });

    logger.warn(`Contact ${id} supprimé définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Contact supprimé définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive contact:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.contact.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille contacts vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} contact(s) supprimé(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille contacts:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.contact.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Contact non trouvé ou déjà archivé' });
    }
    const updated = await prisma.contact.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Contact ${id} archivé par ${req.user.email}`);
    res.json({ success: true, message: 'Contact archivé', contact: updated });
  } catch (error) {
    logger.error('Erreur archivage contact:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.contact.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Contact non trouvé dans les archives' });
    }
    const updated = await prisma.contact.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Contact ${id} désarchivé par ${req.user.email}`);
    res.json({ success: true, message: 'Contact désarchivé', contact: updated });
  } catch (error) {
    logger.error('Erreur désarchivage contact:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.contact.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération contacts archivés:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
