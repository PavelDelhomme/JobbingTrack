const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const logger = require('../utils/logger');
const companyService = require('../services/company.service');
const axios = require('axios');

const prisma = new PrismaClient();

/** Génère un id unique type CUID pour insertion raw (quand Prisma échoue sur colonne isArchived/archived). */
function generateApplicationId() {
  return 'c' + Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

function errorText(error) {
  const msg = (error && error.message) || (error && error.cause && error.cause.message) || String(error);
  const hint = (error && error.meta && typeof error.meta === 'object' && error.meta.message) || '';
  return `${msg}${hint}`;
}

/**
 * Schéma BDD parfois en retard vs client Prisma (ex: deletedAt / isArchived / statusEngineOptOut…).
 * On détecte ces dérives pour activer les fallbacks SQL.
 */
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

function looksLikeStatusCode(value) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]+$/.test(value);
}

async function enrichApplicationStatus(application) {
  if (!application) return application;
  if (application.status && typeof application.status === 'object') return application;

  const statusId = application.statusId || (looksLikeStatusCode(application.status) ? null : application.status);
  if (!statusId) return application;

  try {
    const status = await prisma.applicationStatus.findUnique({ where: { id: statusId } });
    if (status) {
      return {
        ...application,
        statusId: application.statusId || status.id,
        status
      };
    }
  } catch (error) {
    logger.warn('Enrichissement statut candidature ignoré:', error.message);
  }

  return application;
}

async function findApplicationRawById(id, userId, options = {}) {
  const { excludeDeleted = true } = options;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "Application" WHERE "id" = $1 AND "userId" = $2 ${excludeDeleted ? 'AND "deletedAt" IS NULL' : ''} LIMIT 1`,
      id,
      userId
    );
    return mapRawApplicationRow(rows?.[0]);
  } catch (error) {
    const full = errorText(error);
    if (excludeDeleted && full.includes('deletedAt') && full.includes('does not exist')) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "Application" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
        id,
        userId
      );
      return mapRawApplicationRow(rows?.[0]);
    }
    throw error;
  }
}

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-service:3011';

// CREATE - Créer une candidature
const createApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      companyId,  // Peut être fourni directement
      companyName,  // ✅ NOUVEAU - Ou on peut fournir juste le nom
      companyData,  // ✅ NOUVEAU - Données supplémentaires de l'entreprise
      platformId,   // ✅ NOUVEAU - Plateforme de candidature utilisée
      agencyId,     // Boîte d'intérim (optionnel)
      position,
      description,
      location,
      contractType = 'CDI',
      workMode,
      applicationType = 'OFFRE',
      salaryMin,
      salaryMax,
      salaryNegotiable = false,
      status = 'CANDIDATE_PENDING', // Statut (enum ApplicationStatus)
      applicationDate,
      jobUrl,
      notes
    } = req.body;

    // Utiliser le statut fourni ou le statut par défaut (code ApplicationStatus)
    const statusCode = status || 'CANDIDATE_PENDING';
    const statusRow = await prisma.applicationStatus.findFirst({ where: { code: statusCode } });
    if (!statusRow) {
      return res.status(400).json({
        success: false,
        error: `Statut inconnu: ${statusCode}. Exécuter le seed des statuts (scripts/db/seed-status-tables.sql) si besoin.`
      });
    }

    // ✅ LOGIQUE INTELLIGENTE : Gérer automatiquement l'entreprise
    let finalCompanyId = companyId;

    // Si un nom d'entreprise est fourni au lieu d'un ID
    if (companyName && !companyId) {
      logger.info(`🏢 Gestion automatique entreprise: ${companyName}`);
      
      finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );

      logger.info(`✅ Entreprise traitée - ID: ${finalCompanyId}`);
    }

    // Vérifier qu'on a bien un companyId
    if (!finalCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId ou companyName requis'
      });
    }

    let application;
    try {
      application = await prisma.application.create({
        data: {
          userId: req.user.id,
          companyId: finalCompanyId,
          agencyId: agencyId || null,
          platformId: platformId || null,
          position,
          description,
          location,
          contractType,
          workMode,
          applicationType,
          salaryMin,
          salaryMax,
          salaryNegotiable,
          statusId: statusRow.id,
          applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
          jobUrl,
          notes
        },
        include: {
          company: true,
          agency: true,
          platform: true,
          status: true
        }
      });
    } catch (createErr) {
      if (!isLegacyApplicationSchemaError(createErr)) throw createErr;

      try {
        application = await prisma.application.create({
          data: {
            userId: req.user.id,
            companyId: finalCompanyId,
            agencyId: agencyId || null,
            platformId: platformId || null,
            position,
            description,
            location,
            contractType,
            workMode,
            applicationType,
            salaryMin,
            salaryMax,
            salaryNegotiable,
            statusId: statusRow.id,
            applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
            jobUrl,
            notes
          }
        });
        const [company, agency, platform, status] = await Promise.all([
          prisma.company.findUnique({ where: { id: application.companyId } }).catch(() => null),
          application.agencyId ? prisma.company.findUnique({ where: { id: application.agencyId } }).catch(() => null) : null,
          application.platformId ? prisma.platform.findUnique({ where: { id: application.platformId } }).catch(() => null) : null,
          prisma.applicationStatus.findUnique({ where: { id: application.statusId } }).catch(() => null)
        ]);
        application = { ...application, company, agency, platform, status };
      } catch (secondErr) {
        // Second create() peut encore lever (RETURNING avec isArchived) → fallback INSERT raw
        const appId = generateApplicationId();
        const appDate = applicationDate ? new Date(applicationDate) : new Date();
        let rows;
        try {
          rows = await prisma.$queryRawUnsafe(
            `INSERT INTO "Application" ("id", "userId", "companyId", "agencyId", "platformId", "position", "description", "jobUrl", "location", "contractType", "workMode", "applicationType", "statusId", "applicationDate", "salaryMin", "salaryMax", "salaryNegotiable", "notes", "archived", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"ContractType", $11::"WorkMode", $12::"ApplicationType", $13, $14, $15, $16, $17, $18, false, NOW(), NOW())
             RETURNING *`,
            appId,
            req.user.id,
            finalCompanyId,
            agencyId || null,
            platformId || null,
            position || '',
            description || null,
            jobUrl || null,
            location || null,
            contractType || 'CDI',
            workMode || null,
            applicationType || 'OFFRE',
            statusRow.id,
            appDate,
            salaryMin ?? null,
            salaryMax ?? null,
            salaryNegotiable === true,
            notes || null
          );
        } catch (rawInsertErr) {
          const full = errorText(rawInsertErr);
          // Schéma plus ancien sans createdAt/updatedAt explicites : fallback sur insert minimal.
          if (!(full.includes('createdAt') || full.includes('updatedAt')) || !full.includes('does not exist')) {
            throw rawInsertErr;
          }
          rows = await prisma.$queryRawUnsafe(
            `INSERT INTO "Application" ("id", "userId", "companyId", "agencyId", "platformId", "position", "description", "jobUrl", "location", "contractType", "workMode", "applicationType", "statusId", "applicationDate", "salaryMin", "salaryMax", "salaryNegotiable", "notes", "archived")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"ContractType", $11::"WorkMode", $12::"ApplicationType", $13, $14, $15, $16, $17, $18, false)
             RETURNING *`,
            appId,
            req.user.id,
            finalCompanyId,
            agencyId || null,
            platformId || null,
            position || '',
            description || null,
            jobUrl || null,
            location || null,
            contractType || 'CDI',
            workMode || null,
            applicationType || 'OFFRE',
            statusRow.id,
            appDate,
            salaryMin ?? null,
            salaryMax ?? null,
            salaryNegotiable === true,
            notes || null
          );
        }
        const row = rows?.[0];
        if (!row) throw secondErr;
        const rid = row.id ?? row.Id;
        const cid = row.companyId ?? row.companyid;
        const aid = row.agencyId ?? row.agencyid;
        const pid = row.platformId ?? row.platformid;
        const sid = row.statusId ?? row.statusid;
        const [company, agency, platform, status] = await Promise.all([
          cid ? prisma.company.findUnique({ where: { id: cid } }).catch(() => null) : null,
          aid ? prisma.company.findUnique({ where: { id: aid } }).catch(() => null) : null,
          pid ? prisma.platform.findUnique({ where: { id: pid } }).catch(() => null) : null,
          sid ? prisma.applicationStatus.findUnique({ where: { id: sid } }).catch(() => null) : null
        ]);
        const { archived, ...rest } = row;
        application = { ...rest, id: rid, userId: row.userId ?? row.userid, companyId: cid, agencyId: aid, platformId: pid, statusId: sid, isArchived: archived ?? false, company, agency, platform, status };
      }
    }

    // ✅ Créer automatiquement un événement calendrier pour la candidature
    try {
      const eventDate = applicationDate ? new Date(applicationDate) : new Date();
      const companyName = application.company?.name || 'Entreprise';
      const eventTitle = `📝 Candidature: ${position} chez ${companyName}`;
      const eventDescription = `Candidature envoyée pour le poste de ${position}\n\n${description || ''}`;

      await axios.post(
        `${EVENT_SERVICE_URL}/api/v1/events`,
        {
          title: eventTitle,
          description: eventDescription,
          type: 'APPLICATION',
          startDate: eventDate,
          endDate: eventDate,
          allDay: true,
          applicationId: application.id,
          relatedTo: 'APPLICATION',
          relatedId: application.id
        },
        {
          headers: {
            'Authorization': `Bearer ${req.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      logger.info(`✅ Événement calendrier créé pour candidature ${application.id}`);
    } catch (eventError) {
      // Ne pas bloquer la création de candidature si l'événement échoue
      logger.warn(`⚠️ Échec création événement calendrier: ${eventError.message}`);
    }

    // ✅ Créer une activité pour tracer la création (si le modèle Activity existe)
    if (typeof prisma.activity?.create === 'function') {
      try {
        await prisma.activity.create({
          data: {
            applicationId: application.id,
            type: 'APPLICATION_CREATED',
            description: `Candidature créée pour ${position} chez ${application.company?.name || 'Entreprise'}`
          }
        });
      } catch (activityError) {
        logger.warn(`⚠️ Échec création activité: ${activityError.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Candidature créée avec succès',
      application
    });

    logger.info(`✅ Candidature créée: ${application.id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur création candidature:', error);
    next(error);
  }
};

// READ - Lister les candidatures
const getApplications = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      logger.warn('Tentative d\'accès aux candidatures sans authentification');
      return res.status(401).json({
        success: false,
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder aux candidatures'
      });
    }

  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeArchived = 'false', // Inclure les candidatures archivées
    agencyId // Filtre par agence d'intérim (Suivi intérim)
  } = req.query;

    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Si filtre agencyId demandé, utiliser Prisma pour inclure la relation agency
    if (agencyId && typeof agencyId === 'string') {
      const isElevated = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      const where = {
        ...(isElevated ? {} : { userId }),
        agencyId,
        ...(includeArchived !== 'true' && { isArchived: false }),
        ...(status && { status: { code: status } }),
        ...(search && { position: { contains: search, mode: 'insensitive' } })
      };
      try {
        const [list, totalCount] = await Promise.all([
          prisma.application.findMany({
            where,
            include: {
              company: true,
              agency: true,
              platform: true,
              status: true,
              _count: { select: { interviews: true, followUps: true } }
            },
            orderBy: { [sortBy]: sortOrder },
            skip: parseInt(offset, 10),
            take: parseInt(limit, 10) || 100
          }),
          prisma.application.count({ where })
        ]);
        return res.json({
          success: true,
          applications: list,
          pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10) || 100, total: totalCount, pages: Math.ceil(totalCount / (parseInt(limit, 10) || 100 || 1)) }
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') logger.warn('List by agencyId failed:', err?.message);
        return res.status(500).json({ success: false, error: 'Erreur lors du chargement des candidatures par agence' });
      }
    }

    // Liste : requête raw en premier pour éviter erreur colonne isArchived/archived en BDD
    let applications, total;
    try {
      const andArchived = includeArchived === 'true' ? '' : ' AND archived = false';
      const andNotDeleted = ' AND "deletedAt" IS NULL';
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "Application" WHERE "userId" = $1${andArchived}${andNotDeleted}`,
        userId
      );
      total = Number(countResult?.[0]?.count ?? countResult?.[0]?.Count ?? 0);
      const applicationsRaw = await prisma.$queryRawUnsafe(
        `SELECT * FROM "Application" WHERE "userId" = $1${andArchived}${andNotDeleted} ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
        userId,
        parseInt(limit, 10) || 10,
        parseInt(offset, 10) || 0
      );
      applications = (applicationsRaw || []).map(row => {
        const { archived, ...rest } = row;
        const id = row.id ?? row.Id;
        const userIdR = row.userId ?? row.userid;
        const companyIdR = row.companyId ?? row.companyid;
        return { ...rest, id, userId: userIdR, companyId: companyIdR, isArchived: archived ?? false };
      });
      return res.json({
        success: true,
        applications,
        pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / (parseInt(limit, 10) || 1)) }
      });
    } catch (rawListErr) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('List applications raw fallback failed, trying Prisma:', rawListErr.message);
      }
    }

    // Fallback Prisma si raw a échoué
    const where = {
      userId,
      ...(includeArchived !== 'true' && { isArchived: false }),
      ...(status && { status: { code: status } }),
      ...(search && { position: { contains: search, mode: 'insensitive' } })
    };
    try {
      [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            company: true,
            agency: true,
            platform: true,
            status: true,
            _count: { select: { interviews: true, followUps: true } }
          },
          orderBy: { [sortBy]: sortOrder },
          skip: parseInt(offset, 10),
          take: parseInt(limit, 10)
        }),
        prisma.application.count({ where })
      ]);
    } catch (error) {
      const msg = (error && error.message) || (error && error.cause && error.cause.message) || String(error);
      const hint = (error && error.meta && typeof error.meta === 'object' && error.meta.message) || '';
      const full = msg + hint;
      const isArchivedColumnError = full.includes('isArchived') && (full.includes('does not exist') || full.includes('Perhaps you meant') || full.includes('archived'));
      if (isArchivedColumnError && req.user?.id) {
        try {
          const andArchived = includeArchived === 'true' ? '' : ' AND archived = false';
          const countResult = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int as count FROM "Application" WHERE "userId" = $1${andArchived}`,
            userId
          );
          const totalFallback = Number(countResult?.[0]?.count ?? 0);
          const applicationsRaw = await prisma.$queryRawUnsafe(
            `SELECT * FROM "Application" WHERE "userId" = $1${andArchived} ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
            userId,
            parseInt(limit, 10),
            parseInt(offset, 10)
          );
          const applicationsFallback = (applicationsRaw || []).map(row => {
            const { archived, ...rest } = row;
            return { ...rest, id: row.id ?? row.Id, userId: row.userId ?? row.userid, companyId: row.companyId ?? row.companyid, isArchived: archived ?? false };
          });
          return res.json({
            success: true,
            applications: applicationsFallback,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: totalFallback, pages: Math.ceil(totalFallback / (parseInt(limit, 10) || 1)) }
          });
        } catch (rawErr) {
          logger.warn('Fallback raw query (archived column) failed:', rawErr.message);
        }
      }
      // Fallback si table Application n'existe pas (P2021) - Mode développement
      const isTableError = error.code === 'P2021' || 
                          error.code === 'P2022' ||
                          (msg.includes('does not exist') || msg.includes('Table') || (msg.includes('relation') && msg.includes('does not exist')));
      
      if (isTableError && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Application non trouvée, retour de données vides (mode développement)');
        applications = [];
        total = 0;
        return res.json({
          success: true,
          applications: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
          warning: 'Table Application non trouvée. Exécutez "make db-push-all" pour créer les tables.'
        });
      }
      if (process.env.NODE_ENV === 'development') {
        logger.error('Erreur récupération candidatures:', { message: msg, code: error.code });
      } else {
        logger.error('Erreur récupération candidatures:', error);
      }
      return next(error);
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
    // Logger l'erreur complète en développement
    if (process.env.NODE_ENV === 'development') {
      logger.error('Erreur récupération candidatures (catch externe):', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
    } else {
      logger.error('Erreur récupération candidatures:', error);
    }
    next(error);
  }
};

// READ - Une candidature
const getApplication = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }

  try {
    const application = await prisma.application.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        company: true,
        agency: true,
        platform: true,
        status: true,
        interviews: { where: { deletedAt: null }, orderBy: { interviewDate: 'asc' } },
        followUps: { where: { deletedAt: null }, orderBy: { followUpDate: 'desc' } },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    return res.json({ success: true, application: await enrichApplicationStatus(application) });
  } catch (error) {
    if (isLegacyApplicationSchemaError(error)) {
      try {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT * FROM "Application" WHERE "id" = $1 AND "userId" = $2 LIMIT 1`,
          id,
          userId
        );
        const row = rows?.[0];
        if (!row) {
          return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
        }
        const application = mapRawApplicationRow(row);
        return res.json({ success: true, application: await enrichApplicationStatus(application) });
      } catch (rawErr) {
        logger.warn('Fallback getApplication (archived) failed:', rawErr.message);
      }
    }
    logger.error('Erreur récupération candidature:', error);
    next(error);
  }
};

// UPDATE
const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, companyData, ...body } = req.body;

    let existingApplication;
    try {
      existingApplication = await prisma.application.findFirst({
        where: { id, userId: req.user.id }
      });
    } catch (findErr) {
      if (!isLegacyApplicationSchemaError(findErr)) throw findErr;
      existingApplication = await findApplicationRawById(id, req.user.id, { excludeDeleted: false });
    }

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    if (companyName && companyName !== '') {
      logger.info(`🏢 Mise à jour automatique entreprise: ${companyName}`);
      const finalCompanyId = await companyService.getOrCreateCompany(
        companyName,
        companyData || {},
        req.token
      );
      body.companyId = finalCompanyId;
    }

    const allowed = [
      'position', 'description', 'jobUrl', 'location', 'contractType', 'workMode',
      'applicationType', 'applicationDate', 'salaryMin', 'salaryMax', 'salaryNegotiable',
      'notes', 'platformId', 'companyId', 'agencyId', 'statusEngineOptOut', 'thankYouEmailSentAt'
    ];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'applicationDate') updateData[key] = new Date(body[key]);
      else if (key === 'salaryMin' || key === 'salaryMax') updateData[key] = body[key] != null ? parseInt(body[key], 10) : null;
      else if (key === 'salaryNegotiable' || key === 'statusEngineOptOut') updateData[key] = Boolean(body[key]);
      else if (key === 'thankYouEmailSentAt') updateData[key] = body[key] === true || body[key] === 'true' ? new Date() : (body[key] || null);
      else if (key === 'agencyId') updateData[key] = body[key] === '' || body[key] === null ? null : body[key];
      else updateData[key] = body[key];
    }
    if (Object.keys(updateData).length === 0 && !(companyName && companyName !== '')) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }

    let application;
    try {
      application = await prisma.application.update({
        where: { id },
        data: updateData,
        include: { company: true, agency: true, platform: true, status: true }
      });
    } catch (updateErr) {
      if (!isLegacyApplicationSchemaError(updateErr)) throw updateErr;
      const allowedRawCols = new Set([
        'position', 'description', 'jobUrl', 'location', 'contractType', 'workMode',
        'applicationType', 'applicationDate', 'salaryMin', 'salaryMax', 'salaryNegotiable',
        'notes', 'platformId', 'companyId', 'agencyId', 'statusId', 'thankYouEmailSentAt'
      ]);
      const entries = Object.entries(updateData).filter(([k]) => allowedRawCols.has(k));
      if (entries.length > 0) {
        const setClauses = [];
        const params = [];
        for (let i = 0; i < entries.length; i++) {
          const [key, value] = entries[i];
          setClauses.push(`"${key}" = $${i + 1}`);
          params.push(value);
        }
        const idParam = entries.length + 1;
        const userParam = entries.length + 2;
        const rows = await prisma.$queryRawUnsafe(
          `UPDATE "Application" SET ${setClauses.join(', ')}, "updatedAt" = NOW() WHERE "id" = $${idParam} AND "userId" = $${userParam} RETURNING *`,
          ...params,
          id,
          req.user.id
        );
        application = mapRawApplicationRow(rows?.[0]);
      } else {
        application = await findApplicationRawById(id, req.user.id, { excludeDeleted: false });
      }
      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Candidature non trouvée'
        });
      }
    }

    res.json({
      success: true,
      message: 'Candidature mise à jour',
      application
    });

    logger.info(`Candidature mise à jour: ${id} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur mise à jour candidature:', error);
    next(error);
  }
};

// DELETE
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    let existingApplication;
    try {
      existingApplication = await prisma.application.findFirst({
        where: { id, userId: req.user.id, deletedAt: null }
      });
    } catch (findErr) {
      if (!isLegacyApplicationSchemaError(findErr)) throw findErr;
      existingApplication = await findApplicationRawById(id, req.user.id, { excludeDeleted: true });
    }

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const now = new Date();
    try {
      await prisma.application.update({
        where: { id },
        data: { deletedAt: now }
      });
    } catch (deleteErr) {
      if (!isLegacyApplicationSchemaError(deleteErr)) throw deleteErr;
      // Ancien schéma (ou client Prisma en décalage) : fallback hard delete pour ne pas bloquer les scripts API.
      await prisma.$executeRawUnsafe(`DELETE FROM "Application" WHERE "id" = $1 AND "userId" = $2`, id, req.user.id);
    }

    // Cascade: soft-delete les éléments liés
    try {
      await Promise.all([
        prisma.interview.updateMany({ where: { applicationId: id, deletedAt: null }, data: { deletedAt: now } }),
        prisma.followUp.updateMany({ where: { applicationId: id, deletedAt: null }, data: { deletedAt: now } }),
        prisma.call.updateMany({ where: { applicationId: id, deletedAt: null }, data: { deletedAt: now } }),
        prisma.$executeRaw`UPDATE "Event" SET "deletedAt" = ${now} WHERE "applicationId" = ${id} AND "deletedAt" IS NULL`
      ]);
    } catch (e) {
      logger.warn('Cascade soft-delete partielle:', e.message);
    }

    res.json({
      success: true,
      message: 'Candidature déplacée vers la corbeille'
    });

    logger.info(`Candidature ${id} mise à la corbeille par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur suppression candidature:', error);
    next(error);
  }
};

// NOUVEAU - Changer le statut d'une candidature
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: newStatusCode, comment } = req.body; // Accepter status = code ApplicationStatus

    if (!newStatusCode) {
      return res.status(400).json({
        success: false,
        error: 'status requis'
      });
    }

    const existingApplication = await prisma.application.findFirst({
      where: { id, userId: req.user.id },
      include: { status: true }
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const newStatusRow = await prisma.applicationStatus.findFirst({ where: { code: newStatusCode } });
    if (!newStatusRow) {
      return res.status(400).json({
        success: false,
        error: `Statut inconnu: ${newStatusCode}`
      });
    }

    const previousStatusId = existingApplication.statusId;

    // Créer l'historique du changement de statut
    const statusHistory = await prisma.applicationStatusHistory.create({
      data: {
        applicationId: id,
        previousStatusId: previousStatusId || null,
        newStatusId: newStatusRow.id,
        comment: comment || null
      },
      include: {
        previousStatus: true,
        newStatus: true
      }
    });

    // Mettre à jour le statut de la candidature
    const application = await prisma.application.update({
      where: { id },
      data: { statusId: newStatusRow.id },
      include: {
        company: true,
        platform: true,
        status: true
      }
    });

    // Créer une notification (changement de statut) si le modèle existe
    if (typeof prisma.notification?.create === 'function') {
      try {
        const prevCode = existingApplication.status?.code || '?';
        await prisma.notification.create({
          data: {
            userId: existingApplication.userId,
            title: 'Changement de statut',
            message: `Candidature "${application.position}" : ${prevCode} → ${newStatusCode}`,
            type: 'STATUS_CHANGE',
            entityType: 'Application',
            entityId: id
          }
        });
      } catch (e) {
        logger.warn('Création notification statut:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Statut de la candidature mis à jour',
      application: await enrichApplicationStatus(application),
      statusHistory
    });

    logger.info(`Statut candidature ${id} changé vers ${newStatusCode} par ${req.user.email}`);
  } catch (error) {
    logger.error('Erreur changement statut candidature:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir l'historique des statuts d'une candidature
const getApplicationStatusHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Candidature non trouvée'
      });
    }

    const statusHistory = await prisma.applicationStatusHistory.findMany({
      where: { applicationId: id },
      include: {
        previousStatus: true,
        newStatus: true
      },
      orderBy: { changedAt: 'desc' }
    });

    res.json({
      success: true,
      statusHistory,
      total: statusHistory.length
    });
  } catch (error) {
    logger.error('Erreur récupération historique statuts:', error);
    next(error);
  }
};

// Marquer « Email remerciement envoyé » → reset compteur relance (suggestion « Considérer rejetée »)
const markThankYouSent = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Non authentifié' });
    }
    const { id } = req.params;
    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }
    await prisma.application.update({
      where: { id },
      data: { thankYouEmailSentAt: new Date() }
    });
    res.json({ success: true, message: 'Email remerciement enregistré' });
  } catch (error) {
    const msg = error.message || '';
    const isColumnMissing = error.code === 'P2010' || error.code === 'P2022' || /column.*does not exist|thankYouEmailSentAt/i.test(msg);
    if (isColumnMissing) {
      logger.warn('markThankYouSent: colonne manquante (exécuter make db-push-all depuis auth-service ou application-service)');
      return res.status(503).json({
        success: false,
        error: 'Schéma BDD obsolète',
        message: 'Colonne thankYouEmailSentAt manquante. Exécuter make db-push-all.'
      });
    }
    logger.error('Erreur markThankYouSent:', error);
    next(error);
  }
};

// Suggestion « Considérer comme rejetée ? » après 3+ relances sans réponse
const getSuggestionReject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id, deletedAt: null },
      include: {
        status: true,
        followUps: { where: { deletedAt: null }, orderBy: { followUpDate: 'desc' } }
      }
    });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }
    if (application.status?.code === 'REJECTED') {
      return res.json({ success: true, suggestConsiderReject: false, reason: 'Déjà rejetée' });
    }
    // Relances « sans réponse » : pas de response ou statut SENT/NO_RESPONSE/PENDING
    const followUpsWithoutResponse = application.followUps.filter(
      f => !f.response || (f.response && String(f.response).trim() === '')
    );
    const count = followUpsWithoutResponse.length;
    const thankYouRecent = application.thankYouEmailSentAt
      ? (Date.now() - new Date(application.thankYouEmailSentAt).getTime()) < 30 * 24 * 60 * 60 * 1000 // 30 jours
      : false;
    const suggestConsiderReject = count >= 3 && !thankYouRecent;
    res.json({
      success: true,
      suggestConsiderReject,
      followUpCountWithoutResponse: count,
      reason: suggestConsiderReject ? `${count} relance(s) sans réponse` : (thankYouRecent ? 'Email remerciement récent' : 'Moins de 3 relances sans réponse')
    });
  } catch (error) {
    logger.error('Erreur getSuggestionReject:', error);
    next(error);
  }
};

// NOUVEAU - Obtenir les contacts d'une candidature
const getApplicationContacts = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
      where: { id, userId: req.user.id }
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
        contactApplications: {
          some: {
            applicationId: id
          }
        }
      },
      include: {
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      contacts,
      total: contacts.length
    });
  } catch (error) {
    logger.error('Erreur récupération contacts de la candidature:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Application Service opérationnel',
    service: 'application-service',
    timestamp: new Date().toISOString()
  });
};

const timeTravelEntity = async (req, res, next) => {
  try {
    if (process.env.ENABLE_TIME_TRAVEL !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'Time-travel désactivé. Ajoutez ENABLE_TIME_TRAVEL=true dans .env'
      });
    }

    const { entityType, entityId, daysBack } = req.body;
    if (!entityType || !entityId || !daysBack) {
      return res.status(400).json({
        success: false,
        error: 'entityType, entityId et daysBack requis'
      });
    }

    const targetDate = new Date(Date.now() - daysBack * 86400000);
    const modelMap = {
      application: 'application',
      interview: 'interview',
      followup: 'followUp',
      call: 'call',
      event: 'event'
    };

    const model = modelMap[entityType];
    if (!model || !prisma[model]) {
      return res.status(400).json({
        success: false,
        error: `Type d'entité inconnu: ${entityType}`
      });
    }

    const updated = await prisma[model].update({
      where: { id: entityId },
      data: { createdAt: targetDate }
    });

    logger.info(`Time-travel: ${entityType} ${entityId} → ${targetDate.toISOString()} (${daysBack}j en arrière)`);

    res.json({
      success: true,
      message: `${entityType} backdaté de ${daysBack} jours`,
      entity: updated,
      newDate: targetDate.toISOString()
    });
  } catch (error) {
    logger.error('Erreur time-travel:', error);
    next(error);
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  updateApplicationStatus,
  getApplicationStatusHistory,
  getApplicationContacts,
  markThankYouSent,
  getSuggestionReject,
  timeTravelEntity,
  getHealth
};
