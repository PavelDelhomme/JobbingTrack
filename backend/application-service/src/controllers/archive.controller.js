const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

function errorText(error) {
  const msg = (error && error.message) || (error && error.cause && error.cause.message) || String(error);
  const hint = (error && error.meta && typeof error.meta === 'object' && error.meta.message) || '';
  return `${msg}${hint}`;
}

function isLegacyApplicationSchemaError(error) {
  const full = errorText(error);
  const aboutApplication =
    full.includes('prisma.application') || full.includes('"Application"') || full.includes('Application');
  const schemaMismatchHints =
    full.includes('P2021') ||
    full.includes('P2022') ||
    full.includes('does not exist') ||
    full.includes('Unknown arg') ||
    full.includes('Perhaps you meant') ||
    full.includes('column');
  return aboutApplication && schemaMismatchHints;
}

function mapRawApplicationRow(row) {
  if (!row) return null;
  const { archived, ...rest } = row;
  return {
    ...rest,
    id: row.id ?? row.Id,
    userId: row.userId ?? row.userid,
    companyId: row.companyId ?? row.companyid,
    agencyId: row.agencyId ?? row.agencyid ?? null,
    platformId: row.platformId ?? row.platformid ?? null,
    statusId: row.statusId ?? row.statusid ?? null,
    isArchived: archived ?? false
  };
}

async function findApplicationRawByArchiveState(id, userId, archivedState) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Application" WHERE "id" = $1 AND "userId" = $2 AND archived = $3 LIMIT 1`,
    id,
    userId,
    Boolean(archivedState)
  );
  return mapRawApplicationRow(rows?.[0]);
}

async function listApplicationsRaw(userId, options = {}) {
  const { archived = null, deleted = null } = options;
  const clauses = [`"userId" = $1`];
  const params = [userId];
  if (archived !== null) {
    clauses.push(`archived = $${params.length + 1}`);
    params.push(Boolean(archived));
  }
  if (deleted === true) clauses.push(`"deletedAt" IS NOT NULL`);
  if (deleted === false) clauses.push(`"deletedAt" IS NULL`);
  const where = clauses.join(' AND ');
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Application" WHERE ${where} ORDER BY "updatedAt" DESC`,
    ...params
  );
  return (rows || []).map(mapRawApplicationRow);
}

// ARCHIVER UNE CANDIDATURE
const archiveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let application;
    try {
      application = await prisma.application.findFirst({
        where: {
          id,
          userId: req.user.id,
          isArchived: false
        }
      });
    } catch (findErr) {
      if (!isLegacyApplicationSchemaError(findErr)) throw findErr;
      application = await findApplicationRawByArchiveState(id, req.user.id, false);
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée ou déjà archivée'
      });
    }

    // Archiver la candidature
    let archivedApplication;
    try {
      archivedApplication = await prisma.application.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      });
    } catch (updateErr) {
      if (!isLegacyApplicationSchemaError(updateErr)) throw updateErr;
      const rows = await prisma.$queryRawUnsafe(
        `UPDATE "Application" SET archived = true, "archivedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1 AND "userId" = $2 RETURNING *`,
        id,
        req.user.id
      );
      archivedApplication = mapRawApplicationRow(rows?.[0]);
    }

    // Archiver automatiquement tous les éléments liés
    await archiveRelatedElements(id, req.user.id, reason);

    // Créer une activité d'archivage (si le modèle Activity existe)
    if (typeof prisma.activity?.create === 'function') {
      try {
        await prisma.activity.create({
          data: {
            applicationId: id,
            type: 'APPLICATION_ARCHIVED',
            description: `Candidature archivée${reason ? `: ${reason}` : ''}`
          }
        });
      } catch (e) {
        logger.warn('Échec création activité archivage:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Candidature archivée avec succès',
      application: archivedApplication
    });

    logger.info(`Candidature archivée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur archivage candidature:', error);
    next(error);
  }
};

// RESTAURER UNE CANDIDATURE
const restoreApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    let application;
    try {
      application = await prisma.application.findFirst({
        where: {
          id,
          userId: req.user.id,
          isArchived: true
        }
      });
    } catch (findErr) {
      if (!isLegacyApplicationSchemaError(findErr)) throw findErr;
      application = await findApplicationRawByArchiveState(id, req.user.id, true);
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée ou pas archivée'
      });
    }

    // Restaurer la candidature
    let restoredApplication;
    try {
      restoredApplication = await prisma.application.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null
        }
      });
    } catch (updateErr) {
      if (!isLegacyApplicationSchemaError(updateErr)) throw updateErr;
      const rows = await prisma.$queryRawUnsafe(
        `UPDATE "Application" SET archived = false, "archivedAt" = NULL, "updatedAt" = NOW() WHERE "id" = $1 AND "userId" = $2 RETURNING *`,
        id,
        req.user.id
      );
      restoredApplication = mapRawApplicationRow(rows?.[0]);
    }

    // Restaurer automatiquement les éléments liés
    await restoreRelatedElements(id);

    // Créer une activité de restauration (si le modèle Activity existe)
    if (typeof prisma.activity?.create === 'function') {
      try {
        await prisma.activity.create({
          data: {
            applicationId: id,
            type: 'APPLICATION_RESTORED',
            description: 'Candidature restaurée depuis l\'archive'
          }
        });
      } catch (e) {
        logger.warn('Échec création activité restauration:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Candidature restaurée avec succès',
      application: restoredApplication
    });

    logger.info(`Candidature restaurée: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur restauration candidature:', error);
    next(error);
  }
};

// OBTENIR LES CANDIDATURES ARCHIVÉES
const getArchivedApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
      isArchived: true,
      ...(search && {
        OR: [
          { position: { contains: search, mode: 'insensitive' } },
          { company: { name: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    let applications;
    let total;
    try {
      [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            company: true,
            platform: true,
            _count: {
              select: {
                interviews: true,
                followUps: true,
                calls: true
              }
            }
          },
          orderBy: { archivedAt: 'desc' },
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        prisma.application.count({ where })
      ]);
    } catch (listErr) {
      if (!isLegacyApplicationSchemaError(listErr)) throw listErr;
      const rawList = await listApplicationsRaw(req.user.id, { archived: true, deleted: false });
      const q = String(search || '').trim().toLowerCase();
      const filtered = q
        ? rawList.filter((r) => String(r.position || '').toLowerCase().includes(q))
        : rawList;
      total = filtered.length;
      applications = filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    }

    res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération candidatures archivées:', error);
    next(error);
  }
};

// Cascade : archiver tous les éléments liés à une candidature (isArchived)
const archiveRelatedElements = async (applicationId, archivedBy, reason) => {
  try {
    const now = new Date();
    await Promise.all([
      prisma.interview.updateMany({ where: { applicationId, isArchived: false }, data: { isArchived: true, archivedAt: now } }),
      prisma.followUp.updateMany({ where: { applicationId, isArchived: false }, data: { isArchived: true, archivedAt: now } }),
      prisma.call.updateMany({ where: { applicationId, isArchived: false }, data: { isArchived: true, archivedAt: now } }),
      prisma.$executeRaw`UPDATE "Event" SET "isArchived" = true, "archivedAt" = ${now} WHERE "applicationId" = ${applicationId} AND "isArchived" = false`
    ]);
    logger.info(`Éléments liés archivés pour candidature: ${applicationId} (raison: ${reason || 'aucune'})`);
  } catch (error) {
    logger.warn('Cascade archivage partielle:', error.message);
  }
};

// Cascade : désarchiver tous les éléments liés lors de la désarchivation
// Utilisation de raw SQL pour Interview/FollowUp/Call afin de garantir la même table que les services dédiés
const restoreRelatedElements = async (applicationId) => {
  try {
    const [rInterview, rFollowUp, rCall] = await Promise.all([
      prisma.$executeRaw`UPDATE "Interview" SET "isArchived" = false, "archivedAt" = NULL WHERE "applicationId" = ${applicationId} AND "isArchived" = true`,
      prisma.$executeRaw`UPDATE "FollowUp" SET "isArchived" = false, "archivedAt" = NULL WHERE "applicationId" = ${applicationId} AND "isArchived" = true`,
      prisma.$executeRaw`UPDATE "Call" SET "isArchived" = false, "archivedAt" = NULL WHERE "applicationId" = ${applicationId} AND "isArchived" = true`,
      prisma.$executeRaw`UPDATE "Event" SET "isArchived" = false, "archivedAt" = NULL WHERE "applicationId" = ${applicationId} AND "isArchived" = true`
    ]);
    logger.info(`Éléments liés désarchivés pour candidature: ${applicationId} (Interview/FollowUp/Call/Event mis à jour)`);
  } catch (error) {
    logger.warn('Cascade désarchivage partielle:', error.message);
  }
};

// Cascade corbeille : remettre deletedAt à null sur les entités liées lors de la restauration
const restoreRelatedFromTrash = async (applicationId) => {
  try {
    await Promise.all([
      prisma.interview.updateMany({ where: { applicationId, deletedAt: { not: null } }, data: { deletedAt: null } }),
      prisma.followUp.updateMany({ where: { applicationId, deletedAt: { not: null } }, data: { deletedAt: null } }),
      prisma.call.updateMany({ where: { applicationId, deletedAt: { not: null } }, data: { deletedAt: null } }),
      prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = NULL WHERE "applicationId" = ${applicationId} AND "deletedAt" IS NOT NULL`
    ]);
    logger.info(`Éléments liés restaurés de la corbeille pour candidature: ${applicationId}`);
  } catch (error) {
    logger.warn('Cascade restauration corbeille partielle:', error.message);
  }
};

// STATISTIQUES D'ARCHIVAGE
const getArchiveStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await prisma.application.groupBy({
      by: ['isArchived'],
      where: { userId },
      _count: {
        id: true
      }
    });

    const archivedCount = stats.find(s => s.isArchived)?._count.id || 0;
    const activeCount = stats.find(s => !s.isArchived)?._count.id || 0;

    res.json({
      success: true,
      stats: {
        total: archivedCount + activeCount,
        isArchived: archivedCount,
        active: activeCount,
        archivedPercentage: activeCount > 0 ? Math.round((archivedCount / (archivedCount + activeCount)) * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques archivage:', error);
    next(error);
  }
};

// SUPPRIMER DÉFINITIVEMENT UNE CANDIDATURE ARCHIVÉE
const deleteArchivedApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: {
        id,
        userId: req.user.id,
        isArchived: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature archivée non trouvée'
      });
    }

    // Supprimer définitivement (cascade)
    await prisma.application.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Candidature supprimée définitivement'
    });

    logger.info(`Candidature supprimée définitivement: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression candidature archivée:', error);
    next(error);
  }
};

// --- CORBEILLE (soft delete via deletedAt) ---

const getTrash = async (req, res, next) => {
  try {
    let items;
    try {
      items = await prisma.application.findMany({
        where: {
          userId: req.user.id,
          deletedAt: { not: null }
        },
        include: {
          company: true,
          platform: true,
          _count: { select: { interviews: true, followUps: true, calls: true } }
        },
        orderBy: { deletedAt: 'desc' }
      });
    } catch (listErr) {
      if (!isLegacyApplicationSchemaError(listErr)) throw listErr;
      items = await listApplicationsRaw(req.user.id, { deleted: true });
    }

    res.json({ success: true, items, total: items.length });
  } catch (error) {
    logger.error('Erreur récupération corbeille candidatures:', error);
    next(error);
  }
};

const restoreFromTrash = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    const { id } = req.params;

    const item = await prisma.application.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      const alreadyRestored = await prisma.application.findFirst({
        where: { id, userId: req.user.id, deletedAt: null }
      });
      if (alreadyRestored) {
        return res.json({ success: true, message: 'Candidature déjà restaurée depuis la corbeille' });
      }
      return res.status(404).json({ success: false, error: 'Candidature non trouvée dans la corbeille' });
    }

    await prisma.application.update({
      where: { id },
      data: { deletedAt: null }
    });

    // Restaurer aussi les entretiens, relances, appels et événements liés (cascade corbeille)
    await restoreRelatedFromTrash(id);

    // Cascade restore (archivage)
    await restoreRelatedElements(id);

    logger.info(`Candidature ${id} restaurée depuis la corbeille par ${req.user.email}`);
    res.json({ success: true, message: 'Candidature restaurée depuis la corbeille' });
  } catch (error) {
    logger.error('Erreur restauration candidature corbeille:', error);
    if (process.env.NODE_ENV === 'development' && error.code) {
      return res.status(500).json({
        success: false,
        error: error.message,
        code: error.code,
        hint: 'Si P2003: contrainte FK. Vérifier que make db-push-all a été exécuté et que les entités liées existent.'
      });
    }
    next(error);
  }
};

const permanentDeleteFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.application.findFirst({
      where: { id, userId: req.user.id, deletedAt: { not: null } }
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée dans la corbeille' });
    }

    // Cascade: supprimer les événements liés
    try {
      await prisma.$executeRaw`DELETE FROM "Event" WHERE "applicationId" = ${id}`;
    } catch (e) { logger.warn('Cascade événements:', e.message); }

    await prisma.application.delete({ where: { id } });

    logger.warn(`Candidature ${id} supprimée définitivement par ${req.user.email}`);
    res.json({ success: true, message: 'Candidature supprimée définitivement' });
  } catch (error) {
    logger.error('Erreur suppression définitive candidature:', error);
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trashedItems = await prisma.application.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      },
      select: { id: true }
    });

    for (const item of trashedItems) {
      try {
        await prisma.$executeRaw`DELETE FROM "Event" WHERE "applicationId" = ${item.id}`;
      } catch (e) { /* ignore */ }
    }

    const result = await prisma.application.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null, lt: thirtyDaysAgo }
      }
    });

    logger.info(`Corbeille candidatures vidée: ${result.count} élément(s) par ${req.user.email}`);
    res.json({
      success: true,
      deleted: result.count,
      message: `${result.count} candidature(s) supprimée(s) définitivement`
    });
  } catch (error) {
    logger.error('Erreur vidage corbeille candidatures:', error);
    next(error);
  }
};

module.exports = {
  archiveApplication,
  restoreApplication,
  getArchivedApplications,
  getArchiveStats,
  deleteArchivedApplication,
  getTrash,
  restoreFromTrash,
  permanentDeleteFromTrash,
  emptyTrash
};
