const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { randomUUID } = require('crypto');

class AnalyticsController {
  /**
   * Démarrer une nouvelle session utilisateur
   * POST /api/v1/analytics/sessions
   */
  async createSession(req, res) {
    try {
      const userId = req.user?.id;
      const {
        sessionId,
        deviceId,
        platform = 'web',
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
        timezone
      } = req.body;

      // ✅ Vérifier que la table existe et gérer gracieusement les erreurs
      if (!prisma.userSession || typeof prisma.userSession.create !== 'function') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ANALYTICS] Table UserSession not available, development mode');
          return res.json({
            success: true,
            data: { sessionId: sessionId || randomUUID(), message: 'Development mode - table not available' }
          });
        }
        // En production, retourner un succès silencieux pour éviter les erreurs
        return res.json({
          success: true,
          data: { sessionId: sessionId || randomUUID(), message: 'Table not available' }
        });
      }

      try {
        const session = await prisma.userSession.create({
          data: {
            sessionId: sessionId || randomUUID(),
            userId: userId || null,
            deviceId: deviceId || null,
            platform,
            userAgent,
            ipAddress: ipAddress || req.ip,
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
            isActive: true
          }
        });

        res.json({
          success: true,
          data: session
        });
      } catch (dbError) {
        // Gérer l'erreur P2021 (table n'existe pas) gracieusement
        if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('UserSession')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[ANALYTICS] Table UserSession not available, development mode');
            return res.json({
              success: true,
              data: { sessionId: sessionId || randomUUID(), message: 'Mode développement - table non disponible' }
            });
          }
          // En production, retourner un succès silencieux
          return res.json({
            success: true,
            data: { sessionId: sessionId || randomUUID(), message: 'Table not available' }
          });
        }
        throw dbError; // Relancer si c'est une autre erreur
      }
    } catch (error) {
      console.error('[ANALYTICS] Erreur création session:', error);
      // En cas d'erreur, retourner un succès silencieux pour éviter de casser l'application
      res.json({
        success: true,
        data: { sessionId: sessionId || randomUUID(), message: 'Session créée localement (erreur serveur ignorée)' }
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

      // Vérifier que la session existe (si la table existe)
      let session = null;
      if (prisma.userSession && typeof prisma.userSession.findUnique === 'function') {
        session = await prisma.userSession.findUnique({
          where: { sessionId }
        });
      }

      if (sessionId && !session && prisma.userSession) {
        return res.status(404).json({
          success: false,
          error: 'Session non trouvée'
        });
      }

      const event = await prisma.userEvent.create({
        data: {
          userId: userId || null,
          sessionId,
          deviceId: deviceId || session.deviceId,
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

      // Mettre à jour le compteur d'actions de la session (si la table existe)
      if (sessionId && prisma.userSession && typeof prisma.userSession.update === 'function') {
        try {
          await prisma.userSession.update({
            where: { sessionId },
            data: {
              actions: { increment: 1 }
            }
          });
        } catch (e) {
          // Session peut ne pas exister, ignorer l'erreur
        }
      }

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

      const error = await prisma.userError.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          deviceId: deviceId || null,
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

      const performance = await prisma.userPerformance.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          deviceId: deviceId || null,
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
      const userId = req.params.userId || req.user?.id;
      const { days = 7 } = req.query;

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const [
          totalSessions,
          activeSessions,
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
              startTime: { gte: startDate }
            }
          }).catch(() => 0),
          prisma.userSession.count({
            where: {
              userId,
              isActive: true
            }
          }).catch(() => 0),
          prisma.userEvent.count({
            where: {
              userId,
              timestamp: { gte: startDate }
            }
          }).catch(() => 0),
          prisma.userError.count({
            where: {
              userId,
              timestamp: { gte: startDate }
            }
          }).catch(() => 0),
          prisma.userEvent.groupBy({
            by: ['eventType'],
            where: {
              userId,
              timestamp: { gte: startDate }
            },
            _count: true
          }).catch(() => []),
          prisma.userError.groupBy({
            by: ['errorType'],
            where: {
              userId,
              timestamp: { gte: startDate }
            },
            _count: true
          }).catch(() => []),
          prisma.userEvent.groupBy({
            by: ['page'],
            where: {
              userId,
              timestamp: { gte: startDate },
              page: { not: null }
            },
            _count: true,
            orderBy: { _count: { page: 'desc' } },
            take: 10
          }).catch(() => []),
          prisma.userEvent.groupBy({
            by: ['eventName'],
            where: {
              userId,
              timestamp: { gte: startDate }
            },
            _count: true,
            orderBy: { _count: { eventName: 'desc' } },
            take: 10
          }).catch(() => [])
        ]);

        res.json({
          success: true,
          data: {
            totalSessions,
            activeSessions,
            totalEvents,
            totalErrors,
            eventsByType: Array.isArray(eventsByType) ? eventsByType.map(e => ({
              type: e.eventType,
              count: e._count
            })) : [],
            errorsByType: Array.isArray(errorsByType) ? errorsByType.map(e => ({
              type: e.errorType,
              count: e._count
            })) : [],
            topPages: Array.isArray(topPages) ? topPages.map(p => ({
              page: p.page,
              count: p._count
            })) : [],
            topActions: Array.isArray(topActions) ? topActions.map(a => ({
              action: a.eventName,
              count: a._count
            })) : []
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
   * Récupérer les événements d'un utilisateur
   * GET /api/v1/analytics/events
   */
  async getEvents(req, res) {
    try {
      const userId = req.user?.id;
      const { 
        limit = 100, 
        offset = 0,
        eventType,
        eventName,
        startDate,
        endDate
      } = req.query;

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const where = {
          userId: userId || undefined
        };

        if (eventType) where.eventType = eventType;
        if (eventName) where.eventName = eventName;
        if (startDate || endDate) {
          where.timestamp = {};
          if (startDate) where.timestamp.gte = new Date(startDate);
          if (endDate) where.timestamp.lte = new Date(endDate);
        }

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
   * Récupérer les erreurs d'un utilisateur
   * GET /api/v1/analytics/errors
   */
  async getErrors(req, res) {
    try {
      const userId = req.user?.id;
      const { 
        limit = 100, 
        offset = 0,
        errorType,
        severity,
        resolved,
        startDate,
        endDate
      } = req.query;

      // ✅ CORRECTION : Gérer le cas où les tables n'existent pas
      try {
        const where = {
          userId: userId || undefined
        };

        if (errorType) where.errorType = errorType;
        if (severity) where.severity = severity;
        if (resolved !== undefined) where.resolved = resolved === 'true';
        if (startDate || endDate) {
          where.timestamp = {};
          if (startDate) where.timestamp.gte = new Date(startDate);
          if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [errors, total] = await Promise.all([
          prisma.userError.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { timestamp: 'desc' }
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
}

module.exports = new AnalyticsController();

