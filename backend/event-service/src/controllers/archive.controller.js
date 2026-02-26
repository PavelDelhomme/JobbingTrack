const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.event.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      include: {
        eventType: true
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille événements:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.event.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé dans la corbeille' });
    }

    await prisma.event.update({
      where: { id },
      data: { deletedAt: null }
    });

    logger.info(`Événement ${id} restauré depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Événement restauré avec succès' });
  } catch (error) {
    logger.error('Erreur restauration événement:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.event.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé dans la corbeille' });
    }

    await prisma.event.delete({ where: { id } });

    logger.warn(`Événement ${id} supprimé définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Événement supprimé définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive événement:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.event.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille événements vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} événement(s) supprimé(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille événements:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.event.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé ou déjà archivé' });
    }
    const updated = await prisma.event.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Événement ${id} archivé par ${req.user.email}`);
    res.json({ success: true, message: 'Événement archivé', event: updated });
  } catch (error) {
    logger.error('Erreur archivage événement:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.event.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Événement non trouvé dans les archives' });
    }
    const updated = await prisma.event.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Événement ${id} désarchivé par ${req.user.email}`);
    res.json({ success: true, message: 'Événement désarchivé', event: updated });
  } catch (error) {
    logger.error('Erreur désarchivage événement:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.event.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      include: { eventType: true },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération événements archivés:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
