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
      ...(isRead !== undefined && { isRead: isRead === 'true' })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.notification.count({ where })
    ]);

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

    const notification = await prisma.notification.create({
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

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

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

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

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

    await prisma.notification.delete({
      where: { id }
    });

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
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.com',
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
      prisma.notification.count({ where: { userId, isRead: false } }),
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
  getAutomatedReminders,
  createAutomatedReminder,
  updateAutomatedReminder,
  deleteAutomatedReminder,
  getStats,
  getHealth
};
