const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.call.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        callType: true
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille appels:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.call.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé dans la corbeille' });
    }

    await prisma.call.update({
      where: { id },
      data: { deletedAt: null }
    });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = NULL WHERE "callId" = ${id} AND "deletedAt" IS NOT NULL`;
    } catch (e) {
      logger.warn('Cascade restauration événements échouée:', e.message);
    }

    logger.info(`Appel ${id} restauré depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Appel restauré avec succès' });
  } catch (error) {
    logger.error('Erreur restauration appel:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.call.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé dans la corbeille' });
    }

    try {
      await prisma.$executeRaw`DELETE FROM "Event" WHERE "callId" = ${id}`;
    } catch (e) {
      logger.warn('Cascade suppression événements échouée:', e.message);
    }

    await prisma.call.delete({ where: { id } });

    logger.warn(`Appel ${id} supprimé définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Appel supprimé définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive appel:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trashedItems = await prisma.call.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      },
      select: { id: true }
    });

    for (const item of trashedItems) {
      try {
        await prisma.$executeRaw`DELETE FROM "Event" WHERE "callId" = ${item.id}`;
      } catch (e) { /* ignore */ }
    }

    const result = await prisma.call.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille appels vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} appel(s) supprimé(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille appels:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.call.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé ou déjà archivé' });
    }
    const updated = await prisma.call.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Appel ${id} archivé par ${req.user.email}`);
    res.json({ success: true, message: 'Appel archivé', call: updated });
  } catch (error) {
    logger.error('Erreur archivage appel:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.call.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Appel non trouvé dans les archives' });
    }
    const updated = await prisma.call.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Appel ${id} désarchivé par ${req.user.email}`);
    res.json({ success: true, message: 'Appel désarchivé', call: updated });
  } catch (error) {
    logger.error('Erreur désarchivage appel:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.call.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération appels archivés:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
