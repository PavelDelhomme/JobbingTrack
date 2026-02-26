const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.followUp.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } }
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille relances:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.followUp.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée dans la corbeille' });
    }

    await prisma.followUp.update({
      where: { id },
      data: { deletedAt: null }
    });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = NULL WHERE "followUpId" = ${id} AND "deletedAt" IS NOT NULL`;
    } catch (e) {
      logger.warn('Cascade restauration événements échouée:', e.message);
    }

    logger.info(`Relance ${id} restaurée depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Relance restaurée avec succès' });
  } catch (error) {
    logger.error('Erreur restauration relance:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.followUp.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée dans la corbeille' });
    }

    try {
      await prisma.$executeRaw`DELETE FROM "Event" WHERE "followUpId" = ${id}`;
    } catch (e) {
      logger.warn('Cascade suppression événements échouée:', e.message);
    }

    await prisma.followUp.delete({ where: { id } });

    logger.warn(`Relance ${id} supprimée définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Relance supprimée définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive relance:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trashedItems = await prisma.followUp.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      },
      select: { id: true }
    });

    for (const item of trashedItems) {
      try {
        await prisma.$executeRaw`DELETE FROM "Event" WHERE "followUpId" = ${item.id}`;
      } catch (e) { /* ignore */ }
    }

    const result = await prisma.followUp.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille relances vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} relance(s) supprimée(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille relances:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.followUp.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée ou déjà archivée' });
    }
    const updated = await prisma.followUp.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Relance ${id} archivée par ${req.user.email}`);
    res.json({ success: true, message: 'Relance archivée', followUp: updated });
  } catch (error) {
    logger.error('Erreur archivage relance:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.followUp.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Relance non trouvée dans les archives' });
    }
    const updated = await prisma.followUp.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Relance ${id} désarchivée par ${req.user.email}`);
    res.json({ success: true, message: 'Relance désarchivée', followUp: updated });
  } catch (error) {
    logger.error('Erreur désarchivage relance:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.followUp.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } }
      },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération relances archivées:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
