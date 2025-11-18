const { PrismaClient } = require('@prisma/client');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Récupérer les logs d'emails avec pagination et filtres
 */
const getEmailLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      status,
      to,
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Filtres
    if (type) where.type = type;
    if (status) where.status = status;
    if (to) where.to = { contains: to, mode: 'insensitive' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Récupérer les logs avec pagination
    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.emailLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Erreur récupération logs emails:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des logs emails'
    });
  }
};

/**
 * Récupérer un log email spécifique
 */
const getEmailLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.emailLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log email non trouvé'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error('Erreur récupération log email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du log email'
    });
  }
};

/**
 * Récupérer les statistiques des emails
 */
const getEmailStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Statistiques globales
    const [total, sent, failed, pending, byType, byStatus] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'SENT' } }),
      prisma.emailLog.count({ where: { status: 'FAILED' } }),
      prisma.emailLog.count({ where: { status: 'PENDING' } }),
      prisma.emailLog.groupBy({
        by: ['type'],
        _count: { type: true }
      }),
      prisma.emailLog.groupBy({
        by: ['status'],
        _count: { status: true }
      })
    ]);

    // Statistiques sur la période
    const [recentTotal, recentSent, recentFailed] = await Promise.all([
      prisma.emailLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.emailLog.count({
        where: { status: 'SENT', createdAt: { gte: startDate } }
      }),
      prisma.emailLog.count({
        where: { status: 'FAILED', createdAt: { gte: startDate } }
      })
    ]);

    // Taux de succès
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;
    const recentSuccessRate = recentTotal > 0 ? ((recentSent / recentTotal) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        global: {
          total,
          sent,
          failed,
          pending,
          successRate: parseFloat(successRate)
        },
        recent: {
          days: parseInt(days),
          total: recentTotal,
          sent: recentSent,
          failed: recentFailed,
          successRate: parseFloat(recentSuccessRate)
        },
        byType: byType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        byStatus: byStatus.map(item => ({
          status: item.status,
          count: item._count.status
        }))
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques emails:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * Envoyer un email de test
 */
const sendTestEmail = async (req, res) => {
  try {
    const { to, subject, content } = req.body;
    const userId = req.user?.id;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Destinataire et sujet requis'
      });
    }

    const emailContent = content || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Email de Test - JobbingTrack</h1>
        <p>Ceci est un email de test envoyé depuis l'interface d'administration.</p>
        <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement ! ✅</p>
      </div>
    `;

    let emailLog = null;
    try {
      // Logger l'email
      emailLog = await emailService.logEmail({
        userId,
        to,
        from: process.env.SMTP_FROM,
        subject,
        type: 'TEST',
        emailContent,
        metadata: { test: true, sentBy: userId }
      });

      // Envoyer l'email
      const nodemailer = require('nodemailer');
      const transporter = emailService.transporter;
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html: emailContent
      });

      // Mettre à jour le statut
      if (emailLog) {
        await emailService.updateEmailLogStatus(emailLog.id, 'SENT');
      }

      res.json({
        success: true,
        message: 'Email de test envoyé avec succès',
        data: { emailLogId: emailLog?.id }
      });
    } catch (error) {
      if (emailLog) {
        await emailService.updateEmailLogStatus(emailLog.id, 'FAILED', error);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Erreur envoi email test:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'email de test',
      details: error.message
    });
  }
};

/**
 * Renvoyer un email (pour les emails échoués)
 */
const resendEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await prisma.emailLog.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        error: 'Log email non trouvé'
      });
    }

    // Créer un nouveau log
    const newEmailLog = await emailService.logEmail({
      userId: emailLog.userId,
      to: emailLog.to,
      from: emailLog.from,
      subject: emailLog.subject,
      type: emailLog.type,
      emailContent: emailLog.emailContent,
      metadata: { ...emailLog.metadata, resentFrom: id }
    });

    // Envoyer l'email
    try {
      await emailService.transporter.sendMail({
        from: emailLog.from,
        to: emailLog.to,
        subject: emailLog.subject,
        html: emailLog.emailContent
      });

      await emailService.updateEmailLogStatus(newEmailLog.id, 'SENT');

      res.json({
        success: true,
        message: 'Email renvoyé avec succès',
        data: { emailLogId: newEmailLog.id }
      });
    } catch (error) {
      await emailService.updateEmailLogStatus(newEmailLog.id, 'FAILED', error);
      throw error;
    }
  } catch (error) {
    logger.error('Erreur renvoi email:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du renvoi de l\'email',
      details: error.message
    });
  }
};

module.exports = {
  getEmailLogs,
  getEmailLog,
  getEmailStats,
  sendTestEmail,
  resendEmail
};

