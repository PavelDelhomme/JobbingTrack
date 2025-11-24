const { PrismaClient } = require('@prisma/client');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const dns = require('dns').promises;

const execAsync = promisify(exec);
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
    let logs = [];
    let total = 0;

    try {
      [logs, total] = await Promise.all([
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
        }).catch(() => []),
        prisma.emailLog.count({ where }).catch(() => 0)
      ]);
    } catch (dbError) {
      // Si la table n'existe pas, retourner des données vides
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table EmailLog non trouvée, retour de données vides. Exécutez: make db-push-all');
        logs = [];
        total = 0;
      } else {
        throw dbError;
      }
    }

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 0
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
 * Récupérer les statistiques des emails (comme Brevo)
 */
const getEmailStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Vérifier si la table EmailLog existe
    let total = 0, sent = 0, failed = 0, pending = 0, bounced = 0;
    let byType = [], byStatus = [];

    try {
      // Statistiques globales (tous les temps)
      [total, sent, failed, pending, bounced, byType, byStatus] = await Promise.all([
        prisma.emailLog.count(),
        prisma.emailLog.count({ where: { status: 'SENT' } }),
        prisma.emailLog.count({ where: { status: 'FAILED' } }),
        prisma.emailLog.count({ where: { status: 'PENDING' } }),
        prisma.emailLog.count({ where: { status: 'BOUNCED' } }),
        prisma.emailLog.groupBy({
          by: ['type'],
          _count: { type: true }
        }).catch(() => []),
        prisma.emailLog.groupBy({
          by: ['status'],
          _count: { status: true }
        }).catch(() => [])
      ]);
    } catch (dbError) {
      // Si la table n'existe pas, retourner des données vides
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table EmailLog non trouvée, retour de données vides. Exécutez: make db-push-all');
        // Continuer avec des valeurs par défaut
      } else {
        throw dbError;
      }
    }

    // Statistiques sur la période
    let recentTotal = 0, recentSent = 0, recentFailed = 0, recentPending = 0, recentBounced = 0;
    let dailyStats = [];
    let topRecipients = [];

    try {
      [recentTotal, recentSent, recentFailed, recentPending, recentBounced] = await Promise.all([
        prisma.emailLog.count({
          where: { createdAt: { gte: startDate } }
        }).catch(() => 0),
        prisma.emailLog.count({
          where: { status: 'SENT', createdAt: { gte: startDate } }
        }).catch(() => 0),
        prisma.emailLog.count({
          where: { status: 'FAILED', createdAt: { gte: startDate } }
        }).catch(() => 0),
        prisma.emailLog.count({
          where: { status: 'PENDING', createdAt: { gte: startDate } }
        }).catch(() => 0),
        prisma.emailLog.count({
          where: { status: 'BOUNCED', createdAt: { gte: startDate } }
        }).catch(() => 0)
      ]);

      // Statistiques par jour (pour graphiques)
      try {
        dailyStats = await prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sent,
            COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending
          FROM "EmailLog"
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT ${parseInt(days)}
        `;
      } catch (e) {
        logger.warn('Erreur récupération dailyStats:', e.message);
        dailyStats = [];
      }

      // Statistiques par destinataire (top 10)
      try {
        topRecipients = await prisma.emailLog.groupBy({
          by: ['to'],
          _count: { to: true },
          where: { createdAt: { gte: startDate } },
          orderBy: { _count: { to: 'desc' } },
          take: 10
        });
      } catch (e) {
        logger.warn('Erreur récupération topRecipients:', e.message);
        topRecipients = [];
      }
    } catch (dbError) {
      if (dbError.code === 'P2021' && process.env.NODE_ENV === 'development') {
        logger.warn('Table EmailLog non trouvée pour les statistiques récentes');
        // Continuer avec des valeurs par défaut
      } else {
        throw dbError;
      }
    }

    // Taux de succès
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : 0;
    const recentSuccessRate = recentTotal > 0 ? ((recentSent / recentTotal) * 100).toFixed(2) : 0;
    const deliveryRate = recentTotal > 0 ? (((recentSent - recentBounced) / recentTotal) * 100).toFixed(2) : 0;

    // Évolution (comparaison avec période précédente)
    let previousTotal = 0;
    try {
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - parseInt(days));
      previousTotal = await prisma.emailLog.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          } 
        }
      }).catch(() => 0);
    } catch (e) {
      logger.warn('Erreur récupération previousTotal:', e.message);
      previousTotal = 0;
    }

    const evolution = previousTotal > 0 
      ? (((recentTotal - previousTotal) / previousTotal) * 100).toFixed(2)
      : recentTotal > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        global: {
          total,
          sent,
          failed,
          pending,
          bounced,
          successRate: parseFloat(successRate)
        },
        recent: {
          days: parseInt(days),
          total: recentTotal,
          sent: recentSent,
          failed: recentFailed,
          pending: recentPending,
          bounced: recentBounced,
          successRate: parseFloat(recentSuccessRate),
          deliveryRate: parseFloat(deliveryRate),
          evolution: parseFloat(evolution)
        },
        byType: byType.map(item => ({
          type: item.type,
          count: item._count.type
        })),
        byStatus: byStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        dailyStats: dailyStats.map(stat => ({
          date: stat.date ? (stat.date.toISOString ? stat.date.toISOString().split('T')[0] : String(stat.date)) : '',
          total: Number(stat.total || 0),
          sent: Number(stat.sent || 0),
          failed: Number(stat.failed || 0),
          pending: Number(stat.pending || 0)
        })),
        topRecipients: topRecipients.map(item => ({
          email: item.to,
          count: item._count.to
        }))
      }
    });
  } catch (error) {
    logger.error('Erreur récupération statistiques emails:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        <p><strong>Date d'envoi:</strong> ${new Date().toLocaleString('fr-FR')}</p>
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

      // Envoyer l'email via le provider (pattern Strategy - SuperTokens)
      await emailService.sendGenericEmail({
        to,
        subject,
        htmlContent: emailContent,
        textContent: content || null,
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
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
      // Utiliser le nouveau service avec pattern Strategy
      await emailService.sendGenericEmail({
        to: emailLog.to,
        subject: emailLog.subject,
        htmlContent: emailLog.emailContent,
        from: emailLog.from || process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        replyTo: process.env.SMTP_REPLY_TO || 'noreply@jobbingtrack.test',
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

/**
 * Tester la configuration DNS (MX, SPF, DKIM)
 */
const testDNS = async (req, res) => {
  try {
    const domain = req.query.domain || req.body?.domain || 'maily.ovh';
    const results = {
      domain,
      mx: { status: 'pending', records: [], error: null },
      spf: { status: 'pending', record: null, error: null },
      dkim: { status: 'pending', record: null, error: null }
    };

    // Test MX
    try {
      if (!domain || domain.trim() === '') {
        results.mx.status = 'error';
        results.mx.error = 'Domaine non spécifié';
      } else {
        let mxRecords = [];
        
        // Essayer d'abord avec dig (plus précis)
        try {
          const { stdout: mxOutput } = await execAsync(`dig ${domain} MX +short`, { timeout: 5000 });
          mxRecords = mxOutput.trim().split('\n').filter(r => r).map(r => r.trim());
        } catch (digError) {
          // Fallback vers dns.promises si dig n'est pas disponible
          logger.warn('dig non disponible, utilisation de dns.promises:', digError.message);
          try {
            const mxRecordsDns = await dns.resolveMx(domain);
            mxRecords = mxRecordsDns.map(record => `${record.priority} ${record.exchange}`);
          } catch (dnsError) {
            // Améliorer le message d'erreur
            const errorMsg = dnsError.code === 'ENOTFOUND' 
              ? `Domaine ${domain} introuvable`
              : dnsError.code === 'ETIMEDOUT'
              ? `Timeout lors de la résolution DNS pour ${domain}`
              : `Erreur DNS: ${dnsError.message}`;
            throw new Error(errorMsg);
          }
        }
        
        if (mxRecords.length > 0) {
          results.mx.status = 'success';
          results.mx.records = mxRecords;
        } else {
          results.mx.status = 'error';
          results.mx.error = 'Aucun enregistrement MX trouvé';
        }
      }
    } catch (error) {
      results.mx.status = 'error';
      // Améliorer le message d'erreur pour éviter "utilisateur non trouvé"
      const errorMsg = error.message || 'Erreur lors du test MX';
      results.mx.error = errorMsg.includes('utilisateur') || errorMsg.includes('User') 
        ? 'Erreur lors de la résolution DNS MX' 
        : errorMsg;
      logger.error('Erreur test MX:', error);
    }

    // Test SPF
    try {
      if (!domain || domain.trim() === '') {
        results.spf.status = 'error';
        results.spf.error = 'Domaine non spécifié';
      } else {
        let txtRecords = [];
        
        // Essayer d'abord avec dig
        try {
          const { stdout: spfOutput } = await execAsync(`dig ${domain} TXT +short`, { timeout: 5000 });
          txtRecords = spfOutput.trim().split('\n').filter(r => r).map(r => r.replace(/"/g, ''));
        } catch (digError) {
          // Fallback vers dns.promises
          logger.warn('dig non disponible pour SPF, utilisation de dns.promises:', digError.message);
          try {
            const txtRecordsDns = await dns.resolveTxt(domain);
            txtRecords = txtRecordsDns.flat().map(r => r);
          } catch (dnsError) {
            // Améliorer le message d'erreur
            const errorMsg = dnsError.code === 'ENOTFOUND' 
              ? `Domaine ${domain} introuvable`
              : dnsError.code === 'ETIMEDOUT'
              ? `Timeout lors de la résolution DNS pour ${domain}`
              : `Erreur DNS: ${dnsError.message}`;
            throw new Error(errorMsg);
          }
        }
        
        const spfRecord = txtRecords.find(r => r.includes('v=spf1'));
        if (spfRecord) {
          results.spf.status = 'success';
          results.spf.record = spfRecord.replace(/"/g, '');
        } else {
          results.spf.status = 'error';
          results.spf.error = 'Aucun enregistrement SPF trouvé';
        }
      }
    } catch (error) {
      results.spf.status = 'error';
      // Améliorer le message d'erreur pour éviter "utilisateur non trouvé"
      const errorMsg = error.message || 'Erreur lors du test SPF';
      results.spf.error = errorMsg.includes('utilisateur') || errorMsg.includes('User') 
        ? 'Erreur lors de la résolution DNS SPF' 
        : errorMsg;
      logger.error('Erreur test SPF:', error);
    }

    // Test DKIM (chercher _default._domainkey)
    try {
      if (!domain || domain.trim() === '') {
        results.dkim.status = 'warning';
        results.dkim.error = 'Domaine non spécifié';
      } else {
        const dkimDomain = `_default._domainkey.${domain}`;
        let dkimRecord = null;
        
        // Essayer d'abord avec dig
        try {
          const { stdout: dkimOutput } = await execAsync(`dig ${dkimDomain} TXT +short`, { timeout: 5000 });
          dkimRecord = dkimOutput.trim().replace(/"/g, '');
        } catch (digError) {
          // Fallback vers dns.promises
          logger.warn('dig non disponible pour DKIM, utilisation de dns.promises:', digError.message);
          try {
            const dkimRecordsDns = await dns.resolveTxt(dkimDomain);
            dkimRecord = dkimRecordsDns.flat().join('');
          } catch (dnsError) {
            // DKIM est optionnel, donc on ne considère pas ça comme une erreur
            dkimRecord = null;
          }
        }
        
        if (dkimRecord && dkimRecord.includes('v=DKIM1')) {
          results.dkim.status = 'success';
          results.dkim.record = dkimRecord.substring(0, 100) + (dkimRecord.length > 100 ? '...' : '');
        } else {
          results.dkim.status = 'warning';
          results.dkim.error = 'DKIM non configuré (optionnel mais recommandé)';
        }
      }
    } catch (error) {
      results.dkim.status = 'warning';
      // Améliorer le message d'erreur pour éviter "utilisateur non trouvé"
      const errorMsg = error.message || 'DKIM non configuré (optionnel)';
      results.dkim.error = errorMsg.includes('utilisateur') || errorMsg.includes('User') 
        ? 'DKIM non configuré (optionnel mais recommandé)' 
        : 'DKIM non configuré (optionnel mais recommandé)';
      logger.warn('DKIM non trouvé (normal si non configuré):', error.message);
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Erreur test DNS:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test DNS',
      details: error.message
    });
  }
};

/**
 * Tester la connexion SMTP
 */
const testSMTPConnection = async (req, res) => {
  try {
    // Utiliser la méthode verifyConnection du provider (comme SuperTokens)
    const verified = await emailService.verifyConnection();
    
    if (!verified) {
      throw new Error('Connexion SMTP échouée');
    }

    const provider = emailService.getProvider();
    
    res.json({
      success: true,
      message: `Connexion ${provider.getProviderName()} réussie`,
      data: {
        provider: provider.getProviderName(),
        host: process.env.SMTP_HOST || 'non configuré',
        port: process.env.SMTP_PORT || 'non configuré',
        secure: process.env.SMTP_SECURE === 'true',
        from: process.env.SMTP_FROM || 'noreply@jobbingtrack.test',
        user: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}***` : 'non configuré',
      }
    });
  } catch (error) {
    logger.error('Erreur test SMTP:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test de connexion SMTP',
      message: error.message,
      details: {
        host: process.env.SMTP_HOST || 'non configuré',
        port: process.env.SMTP_PORT || 'non configuré',
        secure: process.env.SMTP_SECURE === 'true',
        suggestion: 'Vérifiez vos variables SMTP dans .env et que le serveur SMTP est accessible'
      }
    });
  }
};

module.exports = {
  getEmailLogs,
  getEmailLog,
  getEmailStats,
  sendTestEmail,
  resendEmail,
  testDNS,
  testSMTPConnection
};
