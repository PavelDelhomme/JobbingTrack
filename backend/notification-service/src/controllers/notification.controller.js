const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

// Récupérer toutes les notifications de l'utilisateur
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
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
          read: false
        },
        data: { read: true }
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
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      userId,
      ...(status && { status })
    };

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
      emailLogs,
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
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
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
    const from = process.env.SMTP_FROM || 'noreply@jobbingtrack.test';
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
              alert: alert || null
            }
          }
        });
      }
    } catch (dbError) {
      logger.warn('Log email alerte sécurité indisponible:', dbError.message);
    }

    try {
      await emailService.sendEmail(to, subject, html);

      if (emailLog?.id && prisma.emailLog && typeof prisma.emailLog.update === 'function') {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'SENT',
            sentAt: new Date()
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

    const [
      totalNotifications,
      unreadNotifications,
      totalEmails,
      sentEmails,
      failedEmails,
      activeReminders
    ] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.emailLog.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId, status: 'SENT' } }),
      prisma.emailLog.count({ where: { userId, status: 'FAILED' } }),
      prisma.automatedReminder.count({ where: { userId, isActive: true } })
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

const CRASH_REPORT_EMAIL = process.env.CRASH_REPORT_EMAIL || 'infos@example.invalid';

const reportCrash = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const {
      crashType,
      message: crashMessage,
      stackTrace,
      deviceInfo,
      appVersion,
      sessionId,
      screenName,
      userActions,
      metadata
    } = req.body;

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

    try {
      let effectiveUserId = null;

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

    const emailSubject = `[JobbingTrack Crash] ${crashType} — ${new Date().toLocaleDateString('fr-FR')}`;
    const emailBody = [
      '=== RAPPORT DE CRASH JOBBINGTRACK ===',
      '',
      `Type: ${crashType}`,
      `Message: ${crashMessage}`,
      `Date: ${new Date().toLocaleString('fr-FR')}`,
      `Ecran: ${screenName || 'inconnu'}`,
      '',
      '--- Appareil ---',
      deviceInfo ? [
        `Plateforme: ${deviceInfo.platform || 'N/A'}`,
        `OS: ${deviceInfo.osVersion || 'N/A'}`,
        `Modele: ${deviceInfo.deviceModel || 'N/A'}`,
        `App version: ${deviceInfo.appVersion || appVersion || 'N/A'}`,
      ].join('\n') : 'Infos appareil non disponibles',
      '',
      '--- Stack Trace ---',
      stackTrace || '(non fournie)',
      '',
      '--- Actions utilisateur recentes ---',
      userActions?.length > 0 ? userActions.join('\n') : '(aucune)',
      '',
      '--- Metadata ---',
      JSON.stringify(metadata || {}, null, 2),
      '',
      `Session: ${sessionId || 'N/A'}`,
      `User: ${anonymizedReport.userId}`,
    ].join('\n');

    try {
      await emailService.sendEmail(CRASH_REPORT_EMAIL, emailSubject, emailBody);
      logger.info(`Crash report envoye a ${CRASH_REPORT_EMAIL}: ${crashType}`);
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
  getHealth
};
