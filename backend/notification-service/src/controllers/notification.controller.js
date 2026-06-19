const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { buildCrashReportEmailHtml } = require('../templates/crashReportEmailHtml');
const { compressHtml, maybeDecompressEmailContent } = require('../utils/emailContentCodec');
const { normalizeCrashReport } = require('../utils/normalizeCrashReport');
const {
  resolveNotificationScope,
  buildInAppTypeFilter,
} = require('../constants/inAppNotificationTypes');

const prisma = new PrismaClient();

// Récupérer toutes les notifications de l'utilisateur
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const userId = req.user.id;
    const scope = resolveNotificationScope(req.query);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...buildInAppTypeFilter(scope),
      ...(type && { type }),
      ...(isRead !== undefined && { read: isRead === 'true' })
    };

    // Vérifier si la table existe
    if (!prisma.notification || typeof prisma.notification.findMany !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non disponible, retour de données vides (mode développement)');
        return res.json({
          success: true,
          notifications: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
        });
      }
      throw new Error('Table Notification non disponible');
    }

    let notifications, total;
    try {
      [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.notification.count({ where })
      ]);
    } catch (error) {
      const isTableMissing = error.code === 'P2021';
      const isSchemaError = error.message?.includes('does not exist') || error.code === 'P2022';
      if (isTableMissing || isSchemaError || process.env.NODE_ENV !== 'production') {
        logger.warn('Notifications: retour vide (table ou schéma)', { code: error.code, message: error.message?.slice(0, 80) });
        return res.json({
          success: true,
          notifications: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
        });
      }
      throw error;
    }

    res.json({
      success: true,
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération notifications:', error);
    next(error);
  }
};

// Récupérer une notification
const getNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    logger.error('Erreur récupération notification:', error);
    next(error);
  }
};

// Créer une notification
const createNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, title, message, link, relatedId, relatedType } = req.body;

    // Vérifier si la table existe
    if (!prisma.notification || typeof prisma.notification.create !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non disponible, création ignorée (mode développement)');
        return res.status(201).json({
          success: true,
          notification: { id: 'mock-notification', userId, type, title, message }
        });
      }
      throw new Error('Table Notification non disponible');
    }

    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link,
          relatedId,
          relatedType
        }
      });
    } catch (error) {
      // Fallback si table Notification n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non trouvée, création ignorée (mode développement)');
        return res.status(201).json({
          success: true,
          notification: { id: 'mock-notification', userId, type, title, message }
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      notification
    });

    logger.info(`Notification créée: ${notification.id} pour ${userId}`);
  } catch (error) {
    logger.error('Erreur création notification:', error);
    next(error);
  }
};

// Marquer comme lue
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }

    // Vérifier si la table existe
    if (!prisma.notification || typeof prisma.notification.update !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non disponible, mise à jour ignorée (mode développement)');
        return res.json({ success: true, notification: { id, isRead: true } });
      }
      throw new Error('Table Notification non disponible');
    }

    let updatedNotification;
    try {
      updatedNotification = await prisma.notification.update({
        where: { id },
        data: { read: true }
      });
    } catch (error) {
      // Fallback si table Notification n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non trouvée, mise à jour ignorée (mode développement)');
        return res.json({ success: true, notification: { id, isRead: true } });
      }
      throw error;
    }

    res.json({
      success: true,
      notification: updatedNotification
    });
  } catch (error) {
    logger.error('Erreur marquage notification comme lue:', error);
    next(error);
  }
};

// Marquer toutes comme lues
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const scope = resolveNotificationScope(req.query);

    // Vérifier si la table existe
    if (!prisma.notification || typeof prisma.notification.updateMany !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non disponible, marquage lu ignoré (mode développement)');
        return res.json({ success: true, count: 0 });
      }
      throw new Error('Table Notification non disponible');
    }

    let result;
    try {
      result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
          ...buildInAppTypeFilter(scope),
        },
        data: { read: true, readAt: new Date() }
      });
    } catch (error) {
      // Fallback si table Notification n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non trouvée, marquage lu ignoré (mode développement)');
        return res.json({ success: true, count: 0 });
      }
      throw error;
    }

    res.json({
      success: true,
      message: `${result.count} notifications marquées comme lues`
    });
  } catch (error) {
    logger.error('Erreur marquage toutes notifications:', error);
    next(error);
  }
};

// Supprimer une notification
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }

    // Vérifier si la table existe
    if (!prisma.notification || typeof prisma.notification.delete !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non disponible, suppression ignorée (mode développement)');
        return res.json({ success: true });
      }
      throw new Error('Table Notification non disponible');
    }

    try {
      await prisma.notification.delete({
        where: { id }
      });
    } catch (error) {
      // Fallback si table Notification n'existe pas (P2021) - Mode développement
      if ((error.code === 'P2021' || error.message?.includes('does not exist')) && process.env.NODE_ENV !== 'production') {
        logger.warn('Table Notification non trouvée, suppression ignorée (mode développement)');
        return res.json({ success: true });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression notification:', error);
    next(error);
  }
};

// GESTION DES EMAILS

// Récupérer les logs d'emails
const getEmailLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, q, channel } = req.query;
    const userId = req.user.id;
    const role = String(req.user.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(isAdmin ? {} : { userId }),
      ...(status && { status }),
      ...(type && { type })
    };
    if (channel === 'crash_report') {
      where.metadata = { path: ['channel'], equals: 'crash_report' };
    }
    if (q) {
      const query = String(q).trim();
      if (query) {
        where.OR = [
          { to: { contains: query, mode: 'insensitive' } },
          { from: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } }
        ];
      }
    }

    const [emailLogs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.emailLog.count({ where })
    ]);

    res.json({
      success: true,
      data: emailLogs.map(maybeDecompressEmailContent),
      emailLogs: emailLogs.map(maybeDecompressEmailContent),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération logs emails:', error);
    next(error);
  }
};

// Envoyer un email
const sendEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { to, subject, body, metadata } = req.body;

    // Créer le log d'email
    const emailLog = await prisma.emailLog.create({
      data: {
        userId,
        to,
        from: process.env.SMTP_FROM || 'redacted@example.invalid',
        subject,
        body,
        status: 'PENDING',
        metadata
      }
    });

    // Envoyer l'email
    try {
      await emailService.sendEmail(to, subject, body);
      
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Email envoyé avec succès',
        emailLog
      });
    } catch (emailError) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          errorMsg: emailError.message
        }
      });

      throw emailError;
    }
  } catch (error) {
    logger.error('Erreur envoi email:', error);
    next(error);
  }
};

const sendInternalSecurityAlertEmail = async (req, res, next) => {
  try {
    const { to, subject, html, alert } = req.body;
    const { from, replyTo } = emailService.getSecurityAlertIdentity();
    let emailLog = null;

    try {
      if (prisma.emailLog && typeof prisma.emailLog.create === 'function') {
        emailLog = await prisma.emailLog.create({
          data: {
            userId: null,
            to,
            from,
            subject,
            type: 'NOTIFICATION',
            status: 'PENDING',
            emailContent: html,
            metadata: {
              channel: 'security_alert',
              replyTo: replyTo || null,
              alert: alert || null
            }
          }
        });
      }
    } catch (dbError) {
      logger.warn('Log email alerte sécurité indisponible:', dbError.message);
    }

    try {
      const deliveryInfo = await emailService.sendEmail(to, subject, html, {
        from,
        replyTo,
        securityAlertMirror: process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED === 'true',
        awaitSecurityAlertMirror: process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED === 'true'
      });

      if (emailLog?.id && prisma.emailLog && typeof prisma.emailLog.update === 'function') {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: {
              channel: 'security_alert',
              replyTo: replyTo || null,
              alert: alert || null,
              mirror: deliveryInfo?.securityAlertMirror || null
            }
          }
        });
      }

      return res.status(202).json({
        success: true,
        message: 'Email alerte sécurité envoyé',
        emailLogId: emailLog?.id || null
      });
    } catch (emailError) {
      if (emailLog?.id && prisma.emailLog && typeof prisma.emailLog.update === 'function') {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'FAILED',
            error: emailError.message
          }
        });
      }

      throw emailError;
    }
  } catch (error) {
    logger.error('Erreur envoi email alerte sécurité:', error);
    next(error);
  }
};

// GESTION DES RAPPELS AUTOMATIQUES

// Récupérer les rappels automatiques
const getAutomatedReminders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const reminders = await prisma.automatedReminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    logger.error('Erreur récupération rappels:', error);
    next(error);
  }
};

// Créer un rappel automatique
const createAutomatedReminder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      type,
      title,
      description,
      triggerType,
      triggerValue,
      relatedId,
      relatedType,
      nextTriggerAt
    } = req.body;

    const reminder = await prisma.automatedReminder.create({
      data: {
        userId,
        type,
        title,
        description,
        triggerType,
        triggerValue,
        relatedId,
        relatedType,
        nextTriggerAt: nextTriggerAt ? new Date(nextTriggerAt) : null
      }
    });

    res.status(201).json({
      success: true,
      reminder
    });

    logger.info(`Rappel automatique créé: ${reminder.id} pour ${userId}`);
  } catch (error) {
    logger.error('Erreur création rappel:', error);
    next(error);
  }
};

// Mettre à jour un rappel automatique
const updateAutomatedReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const reminder = await prisma.automatedReminder.findFirst({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Rappel non trouvé'
      });
    }

    const updatedReminder = await prisma.automatedReminder.update({
      where: { id },
      data: {
        ...data,
        nextTriggerAt: data.nextTriggerAt ? new Date(data.nextTriggerAt) : undefined
      }
    });

    res.json({
      success: true,
      reminder: updatedReminder
    });
  } catch (error) {
    logger.error('Erreur mise à jour rappel:', error);
    next(error);
  }
};

// Supprimer un rappel automatique
const deleteAutomatedReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reminder = await prisma.automatedReminder.findFirst({
      where: { id, userId }
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Rappel non trouvé'
      });
    }

    await prisma.automatedReminder.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Rappel supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur suppression rappel:', error);
    next(error);
  }
};

// Statistiques
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const scope = resolveNotificationScope(req.query);
    const inAppWhere = { userId, ...buildInAppTypeFilter(scope) };

    const [
      totalNotifications,
      unreadNotifications,
      totalEmails,
      sentEmails,
      failedEmails,
      activeReminders
    ] = await Promise.all([
      prisma.notification.count({ where: inAppWhere }),
      prisma.notification.count({ where: { ...inAppWhere, read: false } }),
      prisma.emailLog.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId, status: 'SENT' } }),
      prisma.emailLog.count({ where: { userId, status: 'FAILED' } }),
      prisma.automatedReminder && typeof prisma.automatedReminder.count === 'function'
        ? prisma.automatedReminder.count({ where: { userId, isActive: true } })
        : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      stats: {
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications,
          read: totalNotifications - unreadNotifications
        },
        emails: {
          total: totalEmails,
          sent: sentEmails,
          failed: failedEmails,
          successRate: totalEmails > 0 ? ((sentEmails / totalEmails) * 100).toFixed(1) : 0
        },
        reminders: {
          active: activeReminders
        }
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques:', error);
    next(error);
  }
};

const reportCrash = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const normalized = normalizeCrashReport(req.body);
    const {
      crashType,
      message: crashMessage,
      stackTrace,
      effectiveStackTrace,
      deviceInfo,
      appVersion,
      sessionId,
      screenName,
      userActions,
      metadata,
      diagnostic,
      screenshotDataUrl,
    } = normalized;

    if (!crashType || !crashMessage) {
      return res.status(400).json({
        success: false,
        error: 'crashType et message requis'
      });
    }

    const anonymizedReport = {
      crashType,
      message: crashMessage,
      stackTrace: stackTrace || null,
      deviceInfo: deviceInfo ? {
        platform: deviceInfo.platform,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion || appVersion,
        deviceModel: deviceInfo.deviceModel,
        screenSize: deviceInfo.screenSize,
        locale: deviceInfo.locale
      } : null,
      screenName: screenName || null,
      userActions: userActions || [],
      metadata: metadata || {},
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
      userId: userId !== 'anonymous' ? userId.substring(0, 8) + '...' : 'anonymous'
    };

    let effectiveUserId = null;
    try {
      if (userId !== 'anonymous') {
        let existingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!existingUser && req.user?.email) {
          existingUser = await prisma.user.findUnique({
            where: { email: req.user.email },
            select: { id: true },
          });
        }

        if (existingUser) {
          effectiveUserId = existingUser.id;
        } else {
          const email = req.user?.email || `crash-${userId}@unknown.local`;
          try {
            const newUser = await prisma.user.create({
              data: {
                id: userId,
                email,
                password: 'N/A',
                firstName: req.user?.firstName || 'CrashReport',
                lastName: req.user?.lastName || 'User',
                role: req.user?.role || 'USER',
                isActive: true,
              },
              select: { id: true },
            });
            effectiveUserId = newUser.id;
          } catch (createError) {
            if (createError.code === 'P2002') {
              const fallback = await prisma.user.findFirst({
                where: { OR: [{ id: userId }, { email }] },
                select: { id: true },
              });
              effectiveUserId = fallback?.id || null;
            } else {
              throw createError;
            }
          }
        }
      }

      if (effectiveUserId) {
        await prisma.notification.create({
          data: {
            userId: effectiveUserId,
            type: 'CRASH_REPORT',
            title: `Crash: ${crashType}`,
            message: crashMessage.substring(0, 500),
            data: anonymizedReport
          }
        });
      }
    } catch (dbError) {
      logger.warn('Sauvegarde crash en BDD echouee:', dbError.message?.slice(0, 120));
    }

    const normalizedActions = Array.isArray(userActions)
      ? userActions.map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
      : [];

    const emailSubject = (() => {
      const cat = metadata?.category;
      const isFeedback = metadata?.feedback === true;
      if (isFeedback && cat) {
        return `[JobbingTrack Retour] ${cat} — ${new Date().toLocaleDateString('fr-FR')}`;
      }
      return `[JobbingTrack Crash] ${crashType} — ${new Date().toLocaleDateString('fr-FR')}`;
    })();

    const emailHtml = buildCrashReportEmailHtml({
      crashType,
      message: crashMessage,
      stackTrace,
      effectiveStackTrace,
      deviceInfo: deviceInfo
        ? {
            ...deviceInfo,
            appVersion: deviceInfo.appVersion || appVersion,
          }
        : null,
      appVersion: appVersion || deviceInfo?.appVersion,
      sessionId,
      screenName,
      userActions: normalizedActions,
      metadata,
      diagnostic,
      userId: anonymizedReport.userId,
      timestamp: new Date().toLocaleString('fr-FR'),
      screenshotAttached: Boolean(metadata?.screenshotCompressed),
      screenshotDataUrl,
    });

    const emailHtmlStored = compressHtml(emailHtml);

    try {
      const crashReportEmail = process.env.CRASH_REPORT_EMAIL || 'alerts@example.invalid';
      const { from: crashReportFrom, replyTo: crashReportReplyTo } =
        emailService.getCrashReportIdentity();
      const mirrorEnabled =
        process.env.CRASH_REPORT_SMTP_MIRROR_ENABLED === 'true' ||
        process.env.SECURITY_ALERT_SMTP_MIRROR_ENABLED === 'true';

      let emailLog = null;
      try {
        if (prisma.emailLog && typeof prisma.emailLog.create === 'function') {
          emailLog = await prisma.emailLog.create({
            data: {
              userId: effectiveUserId || null,
              to: crashReportEmail,
              from: crashReportFrom,
              subject: emailSubject,
              type: 'NOTIFICATION',
              status: 'PENDING',
              emailContent: emailHtmlStored,
              metadata: {
                channel: 'crash_report',
                crashType,
                feedback: metadata?.feedback === true,
                category: metadata?.category || null,
                screenName: screenName || null,
                contentCompressed: true,
              },
            },
          });
        }
      } catch (logError) {
        logger.warn('Log EmailLog crash report indisponible:', logError.message?.slice(0, 120));
      }

      const deliveryInfo = await emailService.sendEmail(crashReportEmail, emailSubject, emailHtml, {
        from: crashReportFrom,
        replyTo: crashReportReplyTo,
        securityAlertMirror: mirrorEnabled,
        awaitSecurityAlertMirror: mirrorEnabled,
      });

      if (emailLog?.id && prisma.emailLog && typeof prisma.emailLog.update === 'function') {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: {
              channel: 'crash_report',
              crashType,
              feedback: metadata?.feedback === true,
              category: metadata?.category || null,
              screenName: screenName || null,
              mirror: deliveryInfo?.securityAlertMirror || null,
            },
          },
        });
      }

      logger.info(`Crash report envoye au destinataire crash configure: ${crashType}`);
    } catch (emailError) {
      logger.warn('Envoi email crash echoue:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Rapport de crash enregistre',
      reportId: `crash-${Date.now()}`
    });
  } catch (error) {
    logger.error('Erreur report crash:', error);
    next(error);
  }
};

const getCrashReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let reports = [];
    let total = 0;

    try {
      [reports, total] = await Promise.all([
        prisma.notification.findMany({
          where: { type: 'CRASH_REPORT' },
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum
        }),
        prisma.notification.count({ where: { type: 'CRASH_REPORT' } })
      ]);
    } catch (dbError) {
      logger.warn('Lecture crash reports echouee:', dbError.message);
    }

    res.json({
      success: true,
      reports: reports.map(r => ({
        id: r.id,
        type: r.data?.crashType || r.title,
        message: r.message,
        timestamp: r.createdAt,
        deviceInfo: r.data?.deviceInfo,
        screenName: r.data?.screenName
      })),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    logger.error('Erreur lecture crash reports:', error);
    next(error);
  }
};

const getHealth = async (req, res) => {
  res.json({
    success: true,
    message: 'Gestion des notifications opérationnel',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
};

const normalizePushDevices = (settings) => {
  const raw = settings && typeof settings === 'object' ? settings.pushDevices : null;
  return Array.isArray(raw) ? raw.filter((d) => d && typeof d === 'object') : [];
};

const registerPushDevice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token, platform, provider, deviceId } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length < 8) {
      return res.status(400).json({ success: false, error: 'token push invalide' });
    }
    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ success: false, error: 'platform requis (android|ios)' });
    }

    const entry = {
      token: token.trim(),
      platform: String(platform).toLowerCase(),
      provider: provider ? String(provider).toLowerCase() : 'unknown',
      deviceId: deviceId ? String(deviceId) : null,
      updatedAt: new Date().toISOString(),
    };

    if (!prisma.userCustomization || typeof prisma.userCustomization.upsert !== 'function') {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('UserCustomization indisponible — enregistrement push simulé (dev)');
        return res.status(201).json({
          success: true,
          data: { registered: true, device: entry, persisted: false },
        });
      }
      throw new Error('UserCustomization non disponible');
    }

    let existing = null;
    try {
      existing = await prisma.userCustomization.findUnique({ where: { userId } });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Lecture UserCustomization push échouée:', error.message?.slice(0, 120));
        return res.status(201).json({
          success: true,
          data: { registered: true, device: entry, persisted: false },
        });
      }
      throw error;
    }

    const settings = existing?.settings && typeof existing.settings === 'object'
      ? { ...existing.settings }
      : {};
    const devices = normalizePushDevices(settings);
    const key = entry.deviceId || entry.token;
    const nextDevices = [
      entry,
      ...devices.filter((d) => (d.deviceId || d.token) !== key),
    ].slice(0, 10);
    settings.pushDevices = nextDevices;

    await prisma.userCustomization.upsert({
      where: { userId },
      create: { userId, settings },
      update: { settings },
    });

    res.status(201).json({
      success: true,
      data: {
        registered: true,
        deviceCount: nextDevices.length,
        device: entry,
      },
    });
  } catch (error) {
    logger.error('Erreur enregistrement push device:', error);
    next(error);
  }
};

const unregisterPushDevice = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token, deviceId } = req.body;
    if (!token && !deviceId) {
      return res.status(400).json({ success: false, error: 'token ou deviceId requis' });
    }

    if (!prisma.userCustomization || typeof prisma.userCustomization.findUnique !== 'function') {
      return res.json({ success: true, data: { removed: 0 } });
    }

    const existing = await prisma.userCustomization.findUnique({ where: { userId } });
    if (!existing?.settings || typeof existing.settings !== 'object') {
      return res.json({ success: true, data: { removed: 0 } });
    }

    const settings = { ...existing.settings };
    const before = normalizePushDevices(settings).length;
    settings.pushDevices = normalizePushDevices(settings).filter((d) => {
      if (deviceId && d.deviceId === deviceId) return false;
      if (token && d.token === token) return false;
      return true;
    });
    const removed = before - settings.pushDevices.length;

    if (removed > 0) {
      await prisma.userCustomization.update({
        where: { userId },
        data: { settings },
      });
    }

    res.json({ success: true, data: { removed } });
  } catch (error) {
    logger.error('Erreur désenregistrement push device:', error);
    next(error);
  }
};

module.exports = {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getEmailLogs,
  sendEmail,
  sendInternalSecurityAlertEmail,
  getAutomatedReminders,
  createAutomatedReminder,
  updateAutomatedReminder,
  deleteAutomatedReminder,
  getStats,
  reportCrash,
  getCrashReports,
  getHealth,
  registerPushDevice,
  unregisterPushDevice,
};
