const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.interview.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } },
        interviewType: true,
        interviewStyle: true
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille entretiens:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.interview.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé dans la corbeille' });
    }

    await prisma.interview.update({
      where: { id },
      data: { deletedAt: null }
    });

    try {
      await prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = NULL WHERE "interviewId" = ${id} AND "deletedAt" IS NOT NULL`;
    } catch (e) {
      logger.warn('Cascade restauration événements échouée:', e.message);
    }

    logger.info(`Entretien ${id} restauré depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Entretien restauré avec succès' });
  } catch (error) {
    logger.error('Erreur restauration entretien:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.interview.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé dans la corbeille' });
    }

    try {
      await prisma.$executeRaw`DELETE FROM "Event" WHERE "interviewId" = ${id}`;
    } catch (e) {
      logger.warn('Cascade suppression événements échouée:', e.message);
    }

    await prisma.interview.delete({ where: { id } });

    logger.warn(`Entretien ${id} supprimé définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Entretien supprimé définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive entretien:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trashedItems = await prisma.interview.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      },
      select: { id: true }
    });

    for (const item of trashedItems) {
      try {
        await prisma.$executeRaw`DELETE FROM "Event" WHERE "interviewId" = ${item.id}`;
      } catch (e) { /* ignore */ }
    }

    const result = await prisma.interview.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille entretiens vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} entretien(s) supprimé(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille entretiens:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.interview.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé ou déjà archivé' });
    }
    const updated = await prisma.interview.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Entretien ${id} archivé par ${req.user.email}`);
    res.json({ success: true, message: 'Entretien archivé', interview: updated });
  } catch (error) {
    logger.error('Erreur archivage entretien:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.interview.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Entretien non trouvé dans les archives' });
    }
    const updated = await prisma.interview.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Entretien ${id} désarchivé par ${req.user.email}`);
    res.json({ success: true, message: 'Entretien désarchivé', interview: updated });
  } catch (error) {
    logger.error('Erreur désarchivage entretien:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.interview.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      include: {
        application: { select: { id: true, position: true } },
        company: { select: { id: true, name: true } }
      },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération entretiens archivés:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
