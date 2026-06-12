const securityService = require('../services/securityService');
const { logger } = require('../utils/logger');

// Helper pour sérialiser les BigInt en JSON
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item));
  }
  
  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

class SecurityController {
  // Récupérer les métriques de sécurité pour le dashboard
  async getSecurityMetrics(req, res) {
    try {
      const { days = 7 } = req.query;

      const metrics = await securityService.getSecurityMetrics({
        days: parseInt(days)
      });

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques de sécurité'
      });
    }
  }

  // Récupérer les logs de sécurité
  async getSecurityLogs(req, res) {
    try {
      const {
        startDate,
        endDate,
        level,
        category,
        eventType,
        q,
        order = 'desc',
        limit = 100,
        offset = 0
      } = req.query;

      // Par défaut, limiter l'affichage aux 24 dernières heures pour éviter
      // de remonter des centaines de logs historiques non pertinents en UI.
      const defaultStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const parsedStartDate = startDate ? new Date(startDate) : defaultStartDate;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const { logs, total } = await securityService.getSecurityLogs({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        level,
        category,
        eventType,
        q,
        order,
        limit: parsedLimit,
        offset: parsedOffset
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          count: logs.length,
          total,
          startDate: parsedStartDate,
          endDate: parsedEndDate || null
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des logs de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des logs de sécurité'
      });
    }
  }

  // Créer un log de sécurité
  async createSecurityLog(req, res) {
    try {
      const {
        level,
        category,
        eventType,
        message,
        sourceIP,
        userAgent,
        userId,
        endpoint,
        method,
        statusCode,
        responseTime,
        country,
        city,
        riskScore,
        isBlocked,
        metadata
      } = req.body;

      // Validation des champs requis
      if (!level || !category || !eventType || !message) {
        return res.status(400).json({
          success: false,
          message: 'level, category, eventType et message sont requis'
        });
      }

      // Créer le log dans la base de données
      const log = await securityService.createSecurityLog({
        level,
        category,
        eventType,
        message,
        sourceIP,
        userAgent,
        userId,
        endpoint,
        method,
        statusCode,
        responseTime,
        country,
        city,
        riskScore,
        isBlocked,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Log de sécurité créé avec succès',
        data: log
      });
    } catch (error) {
      logger.error('Erreur lors de la création du log de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du log de sécurité'
      });
    }
  }

  // Créer une alerte de sécurité
  async createSecurityAlert(req, res) {
    try {
      const { level, title, description, category, source, metadata } = req.body;

      if (!level || !title || !description || !category) {
        return res.status(400).json({
          success: false,
          message: 'level, title, description et category sont requis'
        });
      }

      const alert = await securityService.createSecurityAlert({
        level,
        title,
        description,
        category,
        source,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Alerte de sécurité créée avec succès',
        data: alert
      });
    } catch (error) {
      logger.error('Erreur lors de la création de l\'alerte de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'alerte de sécurité'
      });
    }
  }

  // Récupérer les alertes de sécurité
  async getSecurityAlerts(req, res) {
    try {
      const { level, limit = 20 } = req.query;

      const alerts = await securityService.getSecurityAlerts({
        level,
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des alertes de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des alertes de sécurité'
      });
    }
  }

  // Déclencher une analyse de sécurité manuelle
  async triggerSecurityAnalysis(req, res) {
    try {
      const report = await securityService.securityScheduler.triggerSecurityAnalysis();

      res.json({
        success: true,
        message: 'Analyse de sécurité déclenchée avec succès',
        data: report
      });
    } catch (error) {
      logger.error('Erreur lors du déclenchement de l\'analyse de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du déclenchement de l\'analyse de sécurité'
      });
    }
  }

  // Récupérer les statistiques de sécurité
  async getSecurityStats(req, res) {
    try {
      const { days = 7 } = req.query;

      let metrics;
      try {
        metrics = await securityService.getSecurityMetrics({
          days: parseInt(days)
        });
      } catch (error) {
        // Si la base de données n'est pas disponible, retourner des données par défaut
        if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
          logger.warn('Tables de sécurité non trouvées, retour de statistiques par défaut');
          return res.json({
            success: true,
            data: {
              overview: {
                totalEvents: 0,
                criticalEvents: 0,
                blockedIPs: 0,
                riskScore: 0
              },
              trends: [],
              topThreats: [],
              vulnerabilities: [],
              recentAlerts: [],
              averageRiskScore: 0,
              mostActiveCountries: []
            }
          });
        }
        throw error;
      }

      // Calculer des statistiques supplémentaires avec gestion d'erreur
      let mostActiveCountries = [];
      try {
        mostActiveCountries = await this.getMostActiveCountries(parseInt(days));
      } catch (error) {
        // Mode silencieux en développement
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Erreur récupération pays actifs, utilisation de tableau vide:', error.message);
        }
        mostActiveCountries = [];
      }

      const stats = {
        overview: metrics.overview || {
          totalEvents: 0,
          criticalEvents: 0,
          blockedIPs: 0,
          riskScore: 0
        },
        trends: metrics.trends || [],
        topThreats: metrics.topThreats || [],
        vulnerabilities: metrics.vulnerabilities || [],
        recentAlerts: (metrics.alerts || []).slice(0, 5),
        // Calculs supplémentaires
        averageRiskScore: (metrics.topThreats || []).length > 0
          ? (metrics.topThreats || []).reduce((sum, threat) => sum + (threat.max_risk_score || 0), 0) / (metrics.topThreats || []).length
          : 0,
        mostActiveCountries
      };

      // Sérialiser les BigInt avant de retourner la réponse
      const serializedStats = serializeBigInt(stats);

      res.json({
        success: true,
        data: serializedStats
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de sécurité',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Récupérer les tendances de sécurité par heure
  async getSecurityTrends(req, res) {
    try {
      const { hours = 24 } = req.query;

      const trends = await securityService.getSecurityTrendsByHour(parseInt(hours));

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des tendances de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des tendances de sécurité'
      });
    }
  }

  // Récupérer les métriques système en temps réel
  async getSystemMetrics(req, res) {
    try {
      const metrics = await securityService.getSystemMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des métriques système:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques système'
      });
    }
  }

  // Générer des données de développement (pour les tests)
  async generateDevelopmentData(req, res) {
    try {
      await securityService.generateDevelopmentData();

      res.json({
        success: true,
        message: 'Données de développement générées avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de la génération des données de développement:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des données de développement'
      });
    }
  }

  // Analyser les risques de sécurité en temps réel
  async analyzeSecurityRisks(req, res) {
    try {
      const riskAnalysis = await securityService.analyzeSecurityRisks();

      res.json({
        success: true,
        data: riskAnalysis
      });
    } catch (error) {
      logger.error('Erreur lors de l\'analyse des risques de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse des risques de sécurité'
      });
    }
  }

  // Récupérer les pays les plus actifs en termes d'attaques
  async getMostActiveCountries(days) {
    try {
      const { prisma } = require('../config/database');
      if (!prisma) {
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const countries = await prisma.$queryRaw`
        SELECT
          country,
          COUNT(*)::int as attacks,
          COUNT(DISTINCT "sourceIP")::int as unique_ips,
          MAX("riskScore")::float as max_risk_score
        FROM security_logs
        WHERE timestamp >= ${startDate}
        AND country IS NOT NULL
        AND (category = 'intrusion' OR category = 'ddos')
        GROUP BY country
        ORDER BY attacks DESC
        LIMIT 10
      `;

      // Convertir les BigInt en Number si nécessaire
      const serialized = (countries || []).map(country => ({
        ...country,
        attacks: typeof country.attacks === 'bigint' ? Number(country.attacks) : country.attacks,
        unique_ips: typeof country.unique_ips === 'bigint' ? Number(country.unique_ips) : country.unique_ips,
        max_risk_score: typeof country.max_risk_score === 'bigint' ? Number(country.max_risk_score) : country.max_risk_score
      }));

      return serialized;
    } catch (error) {
      // Si la table n'existe pas (P2021) ou autre erreur, retourner un tableau vide
      if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
        logger.warn('Table security_logs non trouvée, retour de pays actifs vide');
        return [];
      }
      logger.error('Erreur lors de la récupération des pays actifs:', error);
      return [];
    }
  }

  // Démarrer la génération continue de données de sécurité
  async startContinuousGeneration(req, res) {
    try {
      const { intervalMinutes = 5 } = req.body;

      // Importer le générateur de données
      const dataGenerator = require('../services/dataGenerator');

      dataGenerator.startContinuousGeneration(intervalMinutes);

      res.json({
        success: true,
        message: `Génération continue démarrée (interval: ${intervalMinutes} minutes)`,
        data: {
          intervalMinutes,
          startedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Erreur lors du démarrage de la génération continue:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du démarrage de la génération continue'
      });
    }
  }

  // Arrêter la génération continue de données de sécurité
  async stopContinuousGeneration(req, res) {
    try {
      const dataGenerator = require('../services/dataGenerator');

      dataGenerator.stopContinuousGeneration();

      res.json({
        success: true,
        message: 'Génération continue arrêtée',
        data: {
          stoppedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Erreur lors de l\'arrêt de la génération continue:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'arrêt de la génération continue'
      });
    }
  }

  // Récupérer l'état de la génération continue
  async getGenerationStatus(req, res) {
    try {
      const dataGenerator = require('../services/dataGenerator');

      res.json({
        success: true,
        data: {
          isGenerating: dataGenerator.isGenerating,
          intervalMinutes: dataGenerator.intervalMinutes || 5
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération du statut de génération:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du statut de génération'
      });
    }
  }

  // Créer un log de sécurité (appelé par d'autres services)
  async createSecurityLog(req, res) {
    try {
      const logData = req.body;
      
      const createdLog = await securityService.createSecurityLog(logData);

      res.status(201).json({
        success: true,
        data: createdLog
      });
    } catch (error) {
      logger.error('Erreur lors de la création du log de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du log de sécurité'
      });
    }
  }

  // Récupérer les politiques de sécurité
  async getPolicies(req, res) {
    try {
      // Politiques par défaut
      const policies = [
        {
          id: '1',
          name: 'Blocage IP',
          description: 'Bloquer les IPs suspectes automatiquement',
          enabled: true,
          type: 'ip_blocking',
          config: {
            autoBlock: true,
            threshold: 5, // Nombre de tentatives avant blocage
            duration: 3600000 // Durée du blocage en ms (1 heure)
          }
        },
        {
          id: '2',
          name: 'Rate Limiting',
          description: 'Limiter le nombre de requêtes par IP',
          enabled: true,
          type: 'rate_limiting',
          config: {
            maxRequests: 100,
            windowMinutes: 1
          }
        },
        {
          id: '3',
          name: 'WAF',
          description: 'Web Application Firewall - Protection contre les attaques',
          enabled: true,
          type: 'waf',
          config: {
            sqlInjection: true,
            xss: true,
            pathTraversal: true,
            commandInjection: true
          }
        },
        {
          id: '4',
          name: 'Détection d\'intrusion',
          description: 'Détecter et bloquer les tentatives d\'intrusion',
          enabled: true,
          type: 'intrusion_detection',
          config: {
            sensitivity: 'medium',
            autoBlock: true
          }
        }
      ];

      res.json({
        success: true,
        policies
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des politiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des politiques'
      });
    }
  }

  // Récupérer les IPs bloquées
  async getBlockedIPs(req, res) {
    try {
      // Récupérer les IPs bloquées depuis la base de données si possible
      let blockedIPs = [];
      
      try {
        // ✅ CORRECTION : Utiliser PrismaClient directement depuis le contrôleur firewall
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        // ✅ CORRECTION : Utiliser sourceIP au lieu de ip (champ correct dans SecurityLog)
        const logs = await prisma.securityLog.findMany({
          where: {
            isBlocked: true,
            sourceIP: {
              not: null
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
            }
          },
          select: {
            sourceIP: true,
            createdAt: true,
            message: true,
            blockReason: true
          },
          distinct: ['sourceIP'],
          orderBy: {
            createdAt: 'desc'
          },
          take: 100
        });

        blockedIPs = logs.map(log => ({
          ip: log.sourceIP,
          blockedAt: log.createdAt,
          reason: log.blockReason || log.message || 'Tentative d\'intrusion détectée'
        }));
        
        await prisma.$disconnect();
      } catch (dbError) {
        // ✅ CORRECTION : Ne pas logger en mode développement si table n'existe pas
        if (dbError.code === 'P2021' || (dbError.message && dbError.message.includes('does not exist'))) {
          // Mode silencieux en développement (table sera créée automatiquement)
          // Ne pas logger en développement
        } else {
          // Logger seulement les vraies erreurs (pas les erreurs de table manquante)
          // Même en développement, si c'est une vraie erreur, on la log
          logger.warn('Impossible de récupérer les IPs bloquées depuis la DB:', dbError.message);
        }
      }

      res.json({
        success: true,
        ips: blockedIPs
      });
    } catch (error) {
      // ✅ CORRECTION : Ne logger que les vraies erreurs
      if (!error.message?.includes('does not exist') && error.code !== 'P2021') {
        logger.error('Erreur lors de la récupération des IPs bloquées:', error);
      }
      res.json({
        success: true,
        ips: []
      });
    }
  }
}

module.exports = new SecurityController();
