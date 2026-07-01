const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { randomUUID } = require('crypto');

/**
 * Fenêtre pour stats utilisateur : `days` (glissant depuis maintenant) ou `startDate` + `endDate` (ISO).
 * @returns {{ startDate: Date, endDate: Date } | { error: string, message?: string }}
 */
function resolveUserAnalyticsTimeWindow(query, defaultDays = 7, maxDays = 366) {
  const rawDays = query.days;
  const qStart = query.startDate;
  const qEnd = query.endDate;
  const now = new Date();

  if (qStart && qEnd) {
    const startDate = new Date(String(qStart));
    let endDate = new Date(String(qEnd));
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { error: 'INVALID_DATES', message: 'startDate et endDate doivent être des dates ISO valides.' };
    }
    if (startDate > endDate) {
      return { error: 'INVALID_ORDER', message: 'startDate doit précéder endDate.' };
    }
    if (endDate > now) endDate = now;
    const spanMs = endDate.getTime() - startDate.getTime();
    if (spanMs > maxDays * 86400000) {
      return { error: 'RANGE_TOO_LONG', message: `Plage maximale : ${maxDays} jours.` };
    }
    return { startDate, endDate };
  }

  let d = parseInt(String(rawDays != null ? rawDays : defaultDays), 10);
  if (Number.isNaN(d) || d < 1) d = defaultDays;
  d = Math.min(d, maxDays);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - d);
  return { startDate, endDate: now };
}

/** Filtre plateforme mobile : android, ios et alias mobile. */
function applyPlatformFilter(where, platform) {
  if (!platform) return;
  if (platform === 'mobile') {
    where.platform = { in: ['mobile', 'android', 'ios'] };
  } else {
    where.platform = platform;
  }
}

function isAnalyticsAdmin(role) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** Utilisateur cible pour GET analytics (admin + userId query/param, sinon utilisateur courant). */
function resolveAnalyticsTargetUserId(req) {
  const requesterId = req.user?.id;
  const role = req.user?.role;
  const isAdmin = isAnalyticsAdmin(role);
  const queryUserId = req.query.userId;
  const paramUserId = req.params.userId;

  if (isAdmin && queryUserId) return String(queryUserId);
  if (isAdmin && paramUserId) return String(paramUserId);
  return requesterId || undefined;
}

function assertAnalyticsTargetAccess(req, res, targetUserId) {
  const requesterId = req.user?.id;
  if (!targetUserId || targetUserId === requesterId) return true;
  if (!isAnalyticsAdmin(req.user?.role)) {
    res.status(403).json({ success: false, error: 'Accès analytics refusé pour cet utilisateur' });
    return false;
  }
  return true;
}

/** Compte agrégé Prisma groupBy (_count peut être number ou { _all: n }). */
function countForGroupBy(row) {
  const c = row && row._count;
  if (typeof c === 'number') return c;
  if (c && typeof c._all === 'number') return c._all;
  if (c && typeof c === 'object') {
    const vals = Object.values(c).filter((v) => typeof v === 'number');
    if (vals.length) return vals[0];
  }
  return 0;
}

/** Upsert idempotent d'une session analytics (mobile réutilise le même sessionId). */
async function upsertAnalyticsSession(payload = {}) {
  const {
    sessionId: rawSessionId,
    userId,
    deviceId,
    platform = 'mobile',
    userAgent,
    ipAddress,
    deviceModel,
    osName,
    osVersion,
    browserName,
    browserVersion,
    screenWidth,
    screenHeight,
    language,
    timezone,
  } = payload;

  const sessionId = rawSessionId || randomUUID();
  if (!prisma.userSession || typeof prisma.userSession.upsert !== 'function') {
    return { sessionId, message: 'Table UserSession not available' };
  }

  const createData = {
    sessionId,
    userId: userId || null,
    deviceId: deviceId || null,
    platform,
    userAgent,
    ipAddress,
    deviceModel,
    osName,
    osVersion,
    browserName,
    browserVersion,
    screenWidth,
    screenHeight,
    language,
    timezone,
    startTime: new Date(),
    isActive: true,
  };

  const updateData = {
    ...(userId ? { userId } : {}),
    ...(deviceId ? { deviceId } : {}),
    ...(platform ? { platform } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(ipAddress ? { ipAddress } : {}),
    ...(deviceModel ? { deviceModel } : {}),
    ...(osName ? { osName } : {}),
    ...(osVersion ? { osVersion } : {}),
    ...(browserName ? { browserName } : {}),
    ...(browserVersion ? { browserVersion } : {}),
    ...(screenWidth != null ? { screenWidth } : {}),
    ...(screenHeight != null ? { screenHeight } : {}),
    ...(language ? { language } : {}),
    ...(timezone ? { timezone } : {}),
    isActive: true,
  };

  try {
    return await prisma.userSession.upsert({
      where: { sessionId },
      create: createData,
      update: updateData,
    });
  } catch (e) {
    if (e.code === 'P2002') {
      const existing = await prisma.userSession.findUnique({ where: { sessionId } }).catch(() => null);
      if (existing) return existing;
    }
    if (e.code === 'P2021' || e.message?.includes('does not exist')) {
      return { sessionId, message: 'Table UserSession not available' };
    }
    throw e;
  }
}

/** Crée la session si absente (évite 404 sur POST /events après cold start mobile). */
async function ensureAnalyticsSession({ sessionId, userId, deviceId, platform = 'mobile' }) {
  if (!sessionId || !prisma.userSession) {
    return null;
  }
  return upsertAnalyticsSession({ sessionId, userId, deviceId, platform }).catch(() => null);
}

/** Persiste un événement analytics (partagé unitaire + batch mobile). */
async function persistUserEvent(userId, payload) {
  if (!prisma.userEvent || typeof prisma.userEvent.create !== 'function') {
    if (process.env.NODE_ENV === 'development') {
      return { id: 'dev', message: 'Development mode - table not available' };
    }
    throw new Error('Table UserEvent not available');
  }

  const {
    sessionId,
    deviceId,
    eventType,
    eventName,
    category,
    elementId,
    elementType,
    elementText,
    page,
    properties,
    platform = 'web',
    appVersion
  } = payload || {};

  let session = null;
  if (sessionId) {
    session = await ensureAnalyticsSession({
      sessionId,
      userId,
      deviceId,
      platform: platform || 'mobile'
    });
  }

  const event = await prisma.userEvent.create({
    data: {
      userId: userId || null,
      sessionId,
      deviceId: deviceId || session?.deviceId,
      eventType,
      eventName,
      category,
      elementId,
      elementType,
      elementText,
      page,
      properties: properties || {},
      platform,
      appVersion,
      timestamp: new Date()
    }
  });

  if (sessionId && prisma.userSession && typeof prisma.userSession.update === 'function') {
    try {
      const sessionPatch = { actions: { increment: 1 } };
      if (eventName === 'screen_view' || eventType === 'navigation') {
        sessionPatch.pageViews = { increment: 1 };
      }
      await prisma.userSession.update({
        where: { sessionId },
        data: sessionPatch
      });
    } catch (_) {}
  }

  return event;
}

class AnalyticsController {
  /**
   * Démarrer une nouvelle session utilisateur
   * POST /api/v1/analytics/sessions
   */
  async createSession(req, res) {
    const body = req.body || {};
    const requestedSessionId = body.sessionId;
    const userId = req.user?.id;

    try {
      if (!prisma.userSession || typeof prisma.userSession.upsert !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserSession not available, development mode');
        }
        return res.json({
          success: true,
          data: {
            sessionId: requestedSessionId || randomUUID(),
            message: 'Development mode - table not available',
          },
        });
      }

      const session = await upsertAnalyticsSession({
        ...body,
        userId,
        ipAddress: body.ipAddress || req.ip,
      });

      return res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('[ANALYTICS] Erreur création session:', error);
      return res.json({
        success: true,
        data: {
          sessionId: requestedSessionId || randomUUID(),
          message: 'Session créée localement (erreur serveur ignorée)',
        },
      });
    }
  }

  /**
   * Terminer une session
   * PUT /api/v1/analytics/sessions/:sessionId
   */
  async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { endTime, duration, pageViews, actions, errors } = req.body;

      // Vérifier que la table existe et que le Prisma Client est disponible
      if (!prisma || !prisma.userSession || typeof prisma.userSession.update !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserSession not available, development mode');
          return res.json({
            success: true,
            data: { sessionId, message: 'Development mode - table not available' }
          });
        }
        throw new Error('Table UserSession not available');
      }

      const session = await prisma.userSession.update({
        where: { sessionId },
        data: {
          endTime: endTime ? new Date(endTime) : new Date(),
          duration,
          pageViews,
          actions,
          errors,
          isActive: false
        }
      });

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserSession')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserSession not available, development mode');
          return res.json({
            success: true,
            data: { sessionId: req.params.sessionId, message: 'Mode développement - table non disponible' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur mise à jour session:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour de la session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enregistrer un événement utilisateur
   * POST /api/v1/analytics/events
   */
  async trackEvent(req, res) {
    try {
      // Vérifier que les tables existent
      if (!prisma.userEvent || typeof prisma.userEvent.create !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserEvent not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
        throw new Error('Table UserEvent not available');
      }

      const userId = req.user?.id;
      const {
        sessionId,
        deviceId,
        eventType,
        eventName,
        category,
        elementId,
        elementType,
        elementText,
        page,
        properties,
        platform = 'web',
        appVersion
      } = req.body;

      const event = await persistUserEvent(userId, {
        sessionId,
        deviceId,
        eventType,
        eventName,
        category,
        elementId,
        elementType,
        elementText,
        page,
        properties,
        platform,
        appVersion
      });

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserEvent')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserEvent not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur tracking événement:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement de l\'événement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enregistrer plusieurs événements (flush offline mobile compressé)
   * POST /api/v1/analytics/events/batch
   */
  async trackEventsBatch(req, res) {
    try {
      const userId = req.user?.id;
      const events = req.body?.events;
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Le corps doit contenir un tableau events non vide'
        });
      }
      if (events.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 50 événements par batch'
        });
      }

      const created = [];
      for (const payload of events) {
        if (!payload || typeof payload !== 'object') continue;
        const event = await persistUserEvent(userId, payload);
        created.push(event);
      }

      res.json({
        success: true,
        data: { count: created.length, events: created }
      });
    } catch (error) {
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserEvent')) {
        if (process.env.NODE_ENV === 'development') {
          return res.json({
            success: true,
            data: { count: 0, message: 'Development mode - table not available' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur batch événements:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement batch des événements',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enregistrer une erreur utilisateur
   * POST /api/v1/analytics/errors
   */
  async trackError(req, res) {
    try {
      // Vérifier que la table existe
      if (!prisma.userError || typeof prisma.userError.create !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserError not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
        throw new Error('Table UserError not available');
      }

      const userId = req.user?.id;
      const {
        sessionId,
        deviceId,
        errorType,
        errorName,
        errorMessage,
        stackTrace,
        page,
        userAgent,
        platform = 'web',
        appVersion,
        severity = 'error',
        properties
      } = req.body;

      // Sanitizer le stack trace (limiter la taille)
      const sanitizedStackTrace = stackTrace 
        ? stackTrace.substring(0, 5000) 
        : null;

      let session = null;
      if (sessionId) {
        session = await ensureAnalyticsSession({
          sessionId,
          userId,
          deviceId,
          platform: platform || 'mobile',
        });
      }

      const error = await prisma.userError.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          deviceId: deviceId || session?.deviceId || null,
          errorType,
          errorName,
          errorMessage: errorMessage.substring(0, 1000), // Limiter la taille
          stackTrace: sanitizedStackTrace,
          page,
          userAgent,
          platform,
          appVersion,
          severity,
          properties: properties || {},
          timestamp: new Date()
        }
      });

      // Mettre à jour le compteur d'erreurs de la session si elle existe
      if (sessionId) {
        try {
          await prisma.userSession.update({
            where: { sessionId },
            data: {
              errors: { increment: 1 }
            }
          });
        } catch (e) {
          // Session peut ne pas exister, ignorer l'erreur
        }
      }

      res.json({
        success: true,
        data: error
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserError')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserError not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur tracking erreur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement de l\'erreur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enregistrer une métrique de performance
   * POST /api/v1/analytics/performance
   */
  async trackPerformance(req, res) {
    try {
      // Vérifier que la table existe
      if (!prisma.userPerformance || typeof prisma.userPerformance.create !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserPerformance not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
        throw new Error('Table UserPerformance not available');
      }

      const userId = req.user?.id;
      const {
        sessionId,
        deviceId,
        metricType,
        metricName,
        value,
        duration,
        memoryUsage,
        cpuUsage,
        networkLatency,
        networkType,
        page,
        platform = 'web',
        appVersion
      } = req.body;

      let session = null;
      if (sessionId) {
        session = await ensureAnalyticsSession({
          sessionId,
          userId,
          deviceId,
          platform: platform || 'mobile',
        });
      }

      const performance = await prisma.userPerformance.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          deviceId: deviceId || session?.deviceId || null,
          metricType,
          metricName,
          value,
          duration,
          memoryUsage,
          cpuUsage,
          networkLatency,
          networkType,
          page,
          platform,
          appVersion,
          timestamp: new Date()
        }
      });

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserPerformance')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserPerformance not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur tracking performance:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement de la métrique de performance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enregistrer ou mettre à jour les informations d'un appareil
   * POST /api/v1/analytics/device
   */
  async registerDevice(req, res) {
    try {
      // Vérifier que la table existe
      if (!prisma.deviceInfo || typeof prisma.deviceInfo.upsert !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table DeviceInfo not available, development mode');
          return res.json({
            success: true,
            data: { message: 'Development mode - table not available' }
          });
        }
        throw new Error('Table DeviceInfo not available');
      }

      const userId = req.user?.id;
      const {
        deviceId,
        platform,
        deviceModel,
        osName,
        osVersion,
        appVersion,
        screenWidth,
        screenHeight,
        screenDensity,
        language,
        timezone,
        batteryLevel,
        isCharging,
        networkType
      } = req.body;

      const device = await prisma.deviceInfo.upsert({
        where: { deviceId },
        update: {
          userId: userId || undefined,
          platform,
          deviceModel,
          osName,
          osVersion,
          appVersion,
          screenWidth,
          screenHeight,
          screenDensity,
          language,
          timezone,
          batteryLevel,
          isCharging,
          networkType,
          lastSeen: new Date(),
          totalSessions: { increment: 1 }
        },
        create: {
          deviceId,
          userId: userId || null,
          platform,
          deviceModel,
          osName,
          osVersion,
          appVersion,
          screenWidth,
          screenHeight,
          screenDensity,
          language,
          timezone,
          batteryLevel,
          isCharging,
          networkType,
          firstSeen: new Date(),
          lastSeen: new Date(),
          totalSessions: 1
        }
      });

      if (userId && deviceId && prisma.userSession && typeof prisma.userSession.updateMany === 'function') {
        await prisma.userSession.updateMany({
          where: { userId, deviceId, isActive: true },
          data: {
            ...(deviceModel ? { deviceModel } : {}),
            ...(osName ? { osName } : {}),
            ...(osVersion ? { osVersion } : {}),
            ...(platform ? { platform } : {})
          }
        }).catch(() => {});
      }

      res.json({
        success: true,
        data: device
      });
    } catch (error) {
      // Gérer l'erreur P2021 (table n'existe pas) gracieusement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('DeviceInfo')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table DeviceInfo not available, development mode');
          return res.json({
            success: true,
            data: { deviceId: req.body.deviceId, message: 'Mode développement - table non disponible' }
          });
        }
      }
      console.error('[ANALYTICS] Erreur enregistrement appareil:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'enregistrement de l\'appareil',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupérer les statistiques d'un utilisateur
   * GET /api/v1/analytics/stats/:userId?
   */
  async getUserStats(req, res) {
    try {
      const userId = resolveAnalyticsTargetUserId(req);
      if (!assertAnalyticsTargetAccess(req, res, userId)) return;
      const tw = resolveUserAnalyticsTimeWindow(req.query, 7, 366);
      if (tw.error) {
        return res.status(400).json({ success: false, error: tw.message || tw.error });
      }
      const { startDate, endDate } = tw;
      const timeWhere = { gte: startDate, lte: endDate };

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const [
          totalSessions,
          activeSessions,
          activeSessionsList,
          totalEvents,
          totalErrors,
          eventsByType,
          errorsByType,
          topPages,
          topActions
        ] = await Promise.all([
          prisma.userSession.count({
            where: {
              userId,
              startTime: timeWhere
            }
          }).catch(() => 0),
          prisma.userSession.count({
            where: {
              userId,
              isActive: true
            }
          }).catch(() => 0),
          prisma.userSession.findMany({
            where: {
              userId,
              isActive: true
            },
            orderBy: { startTime: 'desc' },
            take: 25,
            select: {
              sessionId: true,
              platform: true,
              deviceId: true,
              deviceModel: true,
              osName: true,
              osVersion: true,
              browserName: true,
              startTime: true,
              pageViews: true,
              actions: true,
              errors: true
            }
          }).catch(() => []),
          prisma.userEvent.count({
            where: {
              userId,
              timestamp: timeWhere
            }
          }).catch(() => 0),
          prisma.userError.count({
            where: {
              userId,
              timestamp: timeWhere
            }
          }).catch(() => 0),
          prisma.userEvent.groupBy({
            by: ['eventType'],
            where: {
              userId,
              timestamp: timeWhere
            },
            _count: true
          }).catch(() => []),
          prisma.userError.groupBy({
            by: ['errorType'],
            where: {
              userId,
              timestamp: timeWhere
            },
            _count: true
          }).catch(() => []),
          prisma.userEvent.groupBy({
            by: ['page'],
            where: {
              userId,
              timestamp: timeWhere,
              page: { not: null }
            },
            _count: true
          }).catch(() => []),
          prisma.userEvent.groupBy({
            by: ['eventName'],
            where: {
              userId,
              timestamp: timeWhere
            },
            _count: true
          }).catch(() => [])
        ]);

        const topPagesSorted = (Array.isArray(topPages) ? topPages : [])
          .map((p) => ({ page: p.page, count: countForGroupBy(p) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        const topActionsSorted = (Array.isArray(topActions) ? topActions : [])
          .map((a) => ({ action: a.eventName, count: countForGroupBy(a) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        res.json({
          success: true,
          data: {
            totalSessions,
            activeSessions,
            activeSessionsList: Array.isArray(activeSessionsList) ? activeSessionsList : [],
            totalEvents,
            totalErrors,
            eventsByType: Array.isArray(eventsByType) ? eventsByType.map(e => ({
              type: e.eventType,
              count: countForGroupBy(e)
            })) : [],
            errorsByType: Array.isArray(errorsByType) ? errorsByType.map(e => ({
              type: e.errorType,
              count: countForGroupBy(e)
            })) : [],
            topPages: topPagesSorted,
            topActions: topActionsSorted
          }
        });
      } catch (dbError) {
        // ✅ CORRECTION : Si les tables n'existent pas (P2021), retourner des données vides
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          console.warn('[ANALYTICS] Tables analytics non trouvées, retour de données vides (mode développement)');
          res.json({
            success: true,
            data: {
              totalSessions: 0,
              activeSessions: 0,
              activeSessionsList: [],
              totalEvents: 0,
              totalErrors: 0,
              eventsByType: [],
              errorsByType: [],
              topPages: [],
              topActions: []
            }
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur récupération stats:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupérer versions app et appareils pour un utilisateur (analytics utilisateur - onglet Versions & Mobile)
   * GET /api/v1/analytics/stats/:userId/versions
   */
  async getUserVersionsAndDevices(req, res) {
    try {
      const userId = resolveAnalyticsTargetUserId(req);
      if (!assertAnalyticsTargetAccess(req, res, userId)) return;
      const tw = resolveUserAnalyticsTimeWindow(req.query, 90, 366);
      if (tw.error) {
        return res.status(400).json({ success: false, error: tw.message || tw.error });
      }
      const { startDate, endDate } = tw;
      const timeWhere = { gte: startDate, lte: endDate };

      try {
        const hasDeviceInfo = prisma.deviceInfo && typeof prisma.deviceInfo.findMany === 'function';
        const hasUserEvent = prisma.userEvent && typeof prisma.userEvent.groupBy === 'function';
        const hasUserPerformance = prisma.userPerformance && typeof prisma.userPerformance.findMany === 'function';

        const [devices, versionsFromEvents, performances] = await Promise.all([
          hasDeviceInfo
            ? prisma.deviceInfo.findMany({
                where: { userId: userId || undefined },
                orderBy: { lastSeen: 'desc' }
              }).catch(() => [])
            : [],
          hasUserEvent
            ? prisma.userEvent.groupBy({
                by: ['platform', 'appVersion'],
                where: {
                  userId: userId || undefined,
                  timestamp: timeWhere,
                  appVersion: { not: null }
                },
                _count: true
              }).catch(() => [])
            : [],
          hasUserPerformance
            ? prisma.userPerformance.findMany({
                where: { userId: userId || undefined, timestamp: timeWhere },
                orderBy: { timestamp: 'desc' },
                take: 200
              }).catch(() => [])
            : []
        ]);

        const countFor = (c) => (typeof c === 'number' ? c : (c && (c._all ?? Object.values(c)[0])) || 0);
        const versionsByPlatform = (versionsFromEvents || []).reduce((acc, v) => {
          const key = v.platform || 'web';
          if (!acc[key]) acc[key] = [];
          acc[key].push({
            appVersion: v.appVersion || 'N/A',
            count: countFor(v._count)
          });
          return acc;
        }, {});

        res.json({
          success: true,
          data: {
            devices: (devices || []).map(d => ({
              id: d.id,
              deviceId: d.deviceId,
              platform: d.platform,
              deviceModel: d.deviceModel,
              appVersion: d.appVersion,
              osName: d.osName,
              osVersion: d.osVersion,
              firstSeen: d.firstSeen,
              lastSeen: d.lastSeen,
              totalSessions: d.totalSessions
            })),
            versionsByPlatform: versionsByPlatform || {},
            performances: (performances || []).map(p => ({
              id: p.id,
              metricType: p.metricType,
              metricName: p.metricName,
              value: p.value,
              duration: p.duration,
              memoryUsage: p.memoryUsage,
              networkLatency: p.networkLatency,
              cpuUsage: p.cpuUsage,
              page: p.page,
              platform: p.platform,
              deviceId: p.deviceId,
              sessionId: p.sessionId,
              appVersion: p.appVersion,
              timestamp: p.timestamp
            }))
          }
        });
      } catch (dbError) {
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          res.json({
            success: true,
            data: {
              devices: [],
              versionsByPlatform: {},
              performances: []
            }
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur récupération versions/appareils:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des données versions et appareils',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupérer les événements d'un utilisateur
   * GET /api/v1/analytics/events
   */
  async getEvents(req, res) {
    try {
      const targetUserId = resolveAnalyticsTargetUserId(req);
      if (!assertAnalyticsTargetAccess(req, res, targetUserId)) return;
      const role = req.user?.role;
      const isAdmin = isAnalyticsAdmin(role);
      const { 
        limit = 100, 
        offset = 0,
        eventType,
        eventName,
        scope,
        platform
      } = req.query;

      const tw = resolveUserAnalyticsTimeWindow(req.query, 7, 366);
      if (tw.error) {
        return res.status(400).json({ success: false, error: tw.message || tw.error });
      }
      const { startDate, endDate } = tw;

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const where = {};

        if (scope === 'application' && isAdmin) {
          if (platform) applyPlatformFilter(where, platform);
          if (req.query.userId) where.userId = req.query.userId;
        } else {
          where.userId = targetUserId || undefined;
        }

        if (eventType) where.eventType = eventType;
        if (eventName) where.eventName = eventName;
        where.timestamp = { gte: startDate, lte: endDate };

        const [events, total] = await Promise.all([
          prisma.userEvent.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { timestamp: 'desc' },
            include: {
              session: {
                select: {
                  sessionId: true,
                  platform: true,
                  startTime: true
                }
              }
            }
          }).catch(() => []),
          prisma.userEvent.count({ where }).catch(() => 0)
        ]);

        res.json({
          success: true,
          data: Array.isArray(events) ? events : [],
          pagination: {
            total: total || 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil((total || 0) / parseInt(limit))
          }
        });
      } catch (dbError) {
        // ✅ CORRECTION : Si les tables n'existent pas (P2021), retourner des données vides
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          console.warn('[ANALYTICS] Table UserEvent non trouvée, retour de données vides (mode développement)');
          res.json({
            success: true,
            data: [],
            pagination: {
              total: 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
              pages: 0
            }
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur récupération événements:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des événements',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupérer les métriques de performance (admin application ou utilisateur courant)
   * GET /api/v1/analytics/performance
   */
  async getPerformance(req, res) {
    try {
      const targetUserId = resolveAnalyticsTargetUserId(req);
      if (!assertAnalyticsTargetAccess(req, res, targetUserId)) return;
      const role = req.user?.role;
      const isAdmin = isAnalyticsAdmin(role);
      const {
        limit = 100,
        offset = 0,
        metricType,
        scope,
        platform
      } = req.query;

      const tw = resolveUserAnalyticsTimeWindow(req.query, 7, 366);
      if (tw.error) {
        return res.status(400).json({ success: false, error: tw.message || tw.error });
      }
      const { startDate, endDate } = tw;

      try {
        if (!prisma.userPerformance || typeof prisma.userPerformance.findMany !== 'function') {
          return res.json({
            success: true,
            data: [],
            pagination: { total: 0, limit: parseInt(limit), offset: parseInt(offset), pages: 0 }
          });
        }

        const where = {};
        if (scope === 'application' && isAdmin) {
          if (platform) applyPlatformFilter(where, platform);
          if (req.query.userId) where.userId = req.query.userId;
        } else {
          where.userId = targetUserId || undefined;
        }
        if (metricType) where.metricType = metricType;
        where.timestamp = { gte: startDate, lte: endDate };

        const [rows, total] = await Promise.all([
          prisma.userPerformance.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { timestamp: 'desc' }
          }).catch(() => []),
          prisma.userPerformance.count({ where }).catch(() => 0)
        ]);

        res.json({
          success: true,
          data: Array.isArray(rows) ? rows : [],
          pagination: {
            total: total || 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil((total || 0) / parseInt(limit))
          }
        });
      } catch (dbError) {
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          res.json({
            success: true,
            data: [],
            pagination: {
              total: 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
              pages: 0
            }
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur récupération performances:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des métriques de performance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Récupérer les erreurs d'un utilisateur
   * GET /api/v1/analytics/errors
   */
  async getErrors(req, res) {
    try {
      const targetUserId = resolveAnalyticsTargetUserId(req);
      if (!assertAnalyticsTargetAccess(req, res, targetUserId)) return;
      const role = req.user?.role;
      const isAdmin = isAnalyticsAdmin(role);
      const { 
        limit = 100, 
        offset = 0,
        errorType,
        severity,
        resolved,
        scope,
        platform,
        excludeFeedback
      } = req.query;
      const excludeTest = req.query.excludeTest;

      const tw = resolveUserAnalyticsTimeWindow(req.query, 7, 366);
      if (tw.error) {
        return res.status(400).json({ success: false, error: tw.message || tw.error });
      }
      const { startDate, endDate } = tw;

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const where = {};

        if (scope === 'application' && isAdmin) {
          if (platform) applyPlatformFilter(where, platform);
          if (req.query.userId) where.userId = req.query.userId;
        } else {
          where.userId = targetUserId || undefined;
        }

        if (errorType) where.errorType = errorType;
        if (severity) where.severity = severity;
        if (resolved !== undefined) where.resolved = resolved === 'true';
        if (excludeFeedback === 'true') {
          where.errorName = { not: 'ManualReport' };
        }
        if (excludeTest === 'true') {
          where.NOT = {
            OR: [
              { errorMessage: { contains: 'live-verify-', mode: 'insensitive' } },
              { errorMessage: { contains: 'simulation porteur', mode: 'insensitive' } },
              { errorMessage: { contains: 'test validation', mode: 'insensitive' } },
              { errorMessage: { contains: 'smoke auto crash', mode: 'insensitive' } },
              { errorMessage: { contains: 'smoke pipeline', mode: 'insensitive' } },
              { errorMessage: { contains: 'message de test', mode: 'insensitive' } },
            ],
          };
        }
        where.timestamp = { gte: startDate, lte: endDate };

        const [errors, total] = await Promise.all([
          prisma.userError.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { timestamp: 'desc' },
            include: {
              session: {
                select: {
                  sessionId: true,
                  platform: true,
                  deviceModel: true,
                  osName: true,
                  osVersion: true
                }
              }
            }
          }).catch(() => []),
          prisma.userError.count({ where }).catch(() => 0)
        ]);

        res.json({
          success: true,
          data: Array.isArray(errors) ? errors : [],
          pagination: {
            total: total || 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil((total || 0) / parseInt(limit))
          }
        });
      } catch (dbError) {
        // ✅ CORRECTION : Si les tables n'existent pas (P2021), retourner des données vides
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          console.warn('[ANALYTICS] Table UserError non trouvée, retour de données vides (mode développement)');
          res.json({
            success: true,
            data: [],
            pagination: {
              total: 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
              pages: 0
            }
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur récupération erreurs:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des erreurs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Marquer une erreur applicative comme traitée / non traitée
   * PATCH /api/v1/analytics/errors/:id/resolve
   */
  async resolveError(req, res) {
    try {
      if (!isAnalyticsAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, error: 'Accès admin requis' });
      }
      if (!prisma.userError || typeof prisma.userError.update !== 'function') {
        return res.status(503).json({ success: false, error: 'Table UserError non disponible' });
      }

      const { id } = req.params;
      const resolved = req.body?.resolved !== false;

      const updated = await prisma.userError.update({
        where: { id: String(id) },
        data: { resolved: Boolean(resolved) }
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Erreur introuvable' });
      }
      console.error('[ANALYTICS] Erreur résolution erreur:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la mise à jour du statut',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Purge complète des données monitoring mobile (admin) — erreurs, events, perf DB.
   * DELETE /api/v1/analytics/mobile-monitoring/purge
   */
  async purgeMobileMonitoringData(req, res) {
    try {
      if (!isAnalyticsAdmin(req.user?.role)) {
        return res.status(403).json({ success: false, error: 'Accès admin requis' });
      }

      const mobilePlatform = { in: ['mobile', 'android', 'ios'] };

      const [errors, events, perf] = await Promise.all([
        prisma.userError.deleteMany({
          where: {
            OR: [
              { platform: mobilePlatform },
              { errorName: 'ManualReport' },
            ],
          },
        }).catch(() => ({ count: 0 })),
        prisma.userEvent.deleteMany({ where: { platform: mobilePlatform } }).catch(() => ({ count: 0 })),
        prisma.userPerformance.deleteMany({ where: { platform: mobilePlatform } }).catch(() => ({ count: 0 })),
      ]);

      res.json({
        success: true,
        data: {
          deletedErrors: errors.count || 0,
          deletedEvents: events.count || 0,
          deletedPerformance: perf.count || 0,
        },
      });
    } catch (error) {
      console.error('[ANALYTICS] Erreur purge mobile:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la purge des données mobile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
}

module.exports = new AnalyticsController();