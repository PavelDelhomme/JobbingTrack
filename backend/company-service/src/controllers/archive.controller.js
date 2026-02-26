const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getTrash = async (req, res, next) => {
  try {
    const items = await prisma.company.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null }
      },
      orderBy: { deletedAt: 'desc' }
    });

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille entreprises:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.company.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée dans la corbeille' });
    }

    await prisma.company.update({
      where: { id },
      data: { deletedAt: null }
    });

    logger.info(`Entreprise ${id} restaurée depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Entreprise restaurée avec succès' });
  } catch (error) {
    logger.error('Erreur restauration entreprise:', error);
    next(error);
  }
};

const permanentDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.company.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée dans la corbeille' });
    }

    await prisma.company.delete({ where: { id } });

    logger.warn(`Entreprise ${id} supprimée définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Entreprise supprimée définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive entreprise:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.company.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille entreprises vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} entreprise(s) supprimée(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille entreprises:', error);
    next(error);
  }
};

// --- ARCHIVAGE (isArchived) ---

const archiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.company.findFirst({
      where: { id, userId: req.user.id, deletedAt: null, isArchived: false }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée ou déjà archivée' });
    }
    const updated = await prisma.company.update({
      where: { id },
      data: { isArchived: true, archivedAt: new Date() }
    });
    logger.info(`Entreprise ${id} archivée par ${req.user.email}`);
    res.json({ success: true, message: 'Entreprise archivée', company: updated });
  } catch (error) {
    logger.error('Erreur archivage entreprise:', error);
    next(error);
  }
};

const unarchiveItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await prisma.company.findFirst({
      where: { id, userId: req.user.id, isArchived: true }
    });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Entreprise non trouvée dans les archives' });
    }
    const updated = await prisma.company.update({
      where: { id },
      data: { isArchived: false, archivedAt: null }
    });
    logger.info(`Entreprise ${id} désarchivée par ${req.user.email}`);
    res.json({ success: true, message: 'Entreprise désarchivée', company: updated });
  } catch (error) {
    logger.error('Erreur désarchivage entreprise:', error);
    next(error);
  }
};

const getArchived = async (req, res, next) => {
  try {
    const items = await prisma.company.findMany({
      where: { userId: req.user.id, isArchived: true, deletedAt: null },
      orderBy: { archivedAt: 'desc' }
    });
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération entreprises archivées:', error);
    next(error);
  }
};

module.exports = { getTrash, restoreFromTrash, permanentDelete, emptyTrash, archiveItem, unarchiveItem, getArchived };
