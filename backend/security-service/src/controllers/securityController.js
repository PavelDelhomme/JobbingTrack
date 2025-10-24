const securityService = require('../services/securityService');
const { logger } = require('../utils/logger');

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
        limit = 100,
        offset = 0
      } = req.query;

      const logs = await securityService.getSecurityLogs({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        level,
        category,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: logs.length
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

      const metrics = await securityService.getSecurityMetrics({
        days: parseInt(days)
      });

      // Calculer des statistiques supplémentaires
      const stats = {
        overview: metrics.overview,
        trends: metrics.trends,
        topThreats: metrics.topThreats,
        vulnerabilities: metrics.vulnerabilities,
        recentAlerts: metrics.alerts.slice(0, 5),
        // Calculs supplémentaires
        averageRiskScore: metrics.topThreats.length > 0
          ? metrics.topThreats.reduce((sum, threat) => sum + threat.max_risk_score, 0) / metrics.topThreats.length
          : 0,
        mostActiveCountries: await this.getMostActiveCountries(days)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques de sécurité:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de sécurité'
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const countries = await securityService.prisma.$queryRaw`
        SELECT
          country,
          COUNT(*) as attacks,
          COUNT(DISTINCT sourceIP) as unique_ips,
          MAX(riskScore) as max_risk_score
        FROM security_logs
        WHERE timestamp >= ${startDate}
        AND country IS NOT NULL
        AND (category = 'intrusion' OR category = 'ddos')
        GROUP BY country
        ORDER BY attacks DESC
        LIMIT 10
      `;

      return countries;
    } catch (error) {
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
}

module.exports = new SecurityController();
