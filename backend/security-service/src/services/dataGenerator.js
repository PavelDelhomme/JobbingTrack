const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

class SecurityDataGenerator {
  constructor() {
    this.isGenerating = false;
    this.generationInterval = null;
  }

  // Générer des données de sécurité réalistes pour le développement
  async generateRealisticSecurityData() {
    try {
      logger.info('Génération de données de sécurité réalistes...');

      // Générer des logs de sécurité réalistes
      await this.generateSecurityLogs();

      // Générer des vulnérabilités réalistes
      await this.generateVulnerabilities();

      // Générer des tentatives d'intrusion
      await this.generateIntrusionAttempts();

      // Générer des attaques DDoS simulées
      await this.generateDDoSAttacks();

      logger.info('Données de sécurité réalistes générées avec succès');
    } catch (error) {
      logger.error('Erreur lors de la génération des données de sécurité:', error);
    }
  }

  // Démarrer la génération continue de données
  startContinuousGeneration(intervalMinutes = 5) {
    if (this.isGenerating) {
      logger.warn('La génération continue est déjà active');
      return;
    }

    this.isGenerating = true;
    logger.info(`Démarrage de la génération continue (toutes les ${intervalMinutes} minutes)`);

    // Générer immédiatement
    this.generateRealTimeSecurityEvents();

    // Planifier la génération continue
    this.generationInterval = setInterval(() => {
      this.generateRealTimeSecurityEvents();
    }, intervalMinutes * 60 * 1000);
  }

  // Arrêter la génération continue
  stopContinuousGeneration() {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
    }
    this.isGenerating = false;
    logger.info('Génération continue arrêtée');
  }

  // Générer des événements de sécurité en temps réel
  async generateRealTimeSecurityEvents() {
    try {
      logger.debug('Génération d\'événements de sécurité en temps réel...');

      // Générer 1-3 événements par génération
      const eventCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < eventCount; i++) {
        await this.generateRandomSecurityEvent();
      }

      // Créer une alerte si nécessaire
      if (Math.random() > 0.8) {
        await this.generateRandomAlert();
      }

      logger.debug(`${eventCount} événements de sécurité générés`);
    } catch (error) {
      logger.error('Erreur lors de la génération d\'événements en temps réel:', error);
    }
  }

  // Générer un événement de sécurité aléatoire
  async generateRandomSecurityEvent() {
    const eventTypes = [
      { type: 'login_success', category: 'authentication', level: 'info', riskScore: 5 },
      { type: 'login_failure', category: 'authentication', level: 'warning', riskScore: 25 },
      { type: 'suspicious_activity', category: 'intrusion', level: 'warning', riskScore: 70 },
      { type: 'sql_injection', category: 'intrusion', level: 'error', riskScore: 85 },
      { type: 'xss_attempt', category: 'intrusion', level: 'error', riskScore: 75 },
      { type: 'brute_force', category: 'intrusion', level: 'warning', riskScore: 70 },
      { type: 'high_traffic', category: 'ddos', level: 'warning', riskScore: 60 },
      { type: 'rate_limit_exceeded', category: 'authentication', level: 'warning', riskScore: 40 }
    ];

    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const ips = ['192.168.1.100', '10.0.0.50', '203.0.113.1', '198.51.100.1', '172.16.0.1'];
    const endpoints = ['/api/v1/auth/login', '/api/v1/companies', '/api/v1/applications', '/api/v1/users', '/api/v1/dashboard'];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'curl/7.68.0',
      'python-requests/2.25.1'
    ];

    const ip = ips[Math.floor(Math.random() * ips.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    let message = '';
    switch (eventType.type) {
      case 'login_success':
        message = 'Connexion utilisateur réussie';
        break;
      case 'login_failure':
        message = 'Échec d\'authentification - identifiants incorrects';
        break;
      case 'suspicious_activity':
        message = 'Activité suspecte détectée - pattern inhabituel';
        break;
      case 'sql_injection':
        message = 'Tentative d\'injection SQL détectée et bloquée';
        break;
      case 'xss_attempt':
        message = 'Tentative XSS détectée et neutralisée';
        break;
      case 'brute_force':
        message = 'Tentative de force brute détectée';
        break;
      case 'high_traffic':
        message = 'Pic de trafic détecté - surveillance activée';
        break;
      case 'rate_limit_exceeded':
        message = 'Limite de taux dépassée - IP temporairement restreinte';
        break;
    }

    // Utiliser geoip-lite pour obtenir le pays réel
    let country = 'FR';
    try {
      const geoip = require('geoip-lite');
      const geo = geoip.lookup(ip);
      if (geo && geo.country) {
        country = geo.country;
      }
    } catch (error) {
      // Fallback si geoip-lite n'est pas disponible
    }

    await prisma.securityLog.create({
      data: {
        level: eventType.level,
        category: eventType.category,
        eventType: eventType.type,
        message,
        sourceIP: ip,
        country,
        endpoint,
        userAgent,
        riskScore: eventType.riskScore,
        isBlocked: eventType.riskScore > 70,
        metadata: {
          automated: true,
          timestamp: new Date(),
          confidence: Math.random() * 0.3 + 0.7 // 70-100% de confiance
        }
      }
    });

    // Créer une tentative d'intrusion si le risque est élevé
    if (eventType.riskScore > 70 && ['sql_injection', 'xss_attempt', 'brute_force'].includes(eventType.type)) {
      await this.createIntrusionAttempt(eventType, ip, endpoint, userAgent);
    }

    // Créer une alerte si le risque est critique
    if (eventType.riskScore > 80) {
      await this.createSecurityAlert(eventType, message, ip);
    }
  }

  // Créer une tentative d'intrusion
  async createIntrusionAttempt(eventType, ip, endpoint, userAgent) {
    const attackTypes = {
      'sql_injection': 'SQL_INJECTION',
      'xss_attempt': 'XSS',
      'brute_force': 'BRUTE_FORCE'
    };

    try {
      const geoip = require('geoip-lite');
      const geo = geoip.lookup(ip);

      await prisma.intrusionAttempt.create({
        data: {
          sourceIP: ip,
          country: geo?.country,
          city: geo?.city,
          attackType: attackTypes[eventType.type] || 'UNKNOWN',
          targetEndpoint: endpoint,
          method: 'POST',
          userAgent,
          riskScore: eventType.riskScore,
          isBlocked: true,
          blockReason: `${eventType.type} détecté`,
          payload: eventType.type === 'sql_injection' ? "'; DROP TABLE users; --" : undefined
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la création de la tentative d\'intrusion:', error);
    }
  }

  // Créer une alerte de sécurité
  async createSecurityAlert(eventType, message, sourceIP) {
    try {
      await prisma.securityAlert.create({
        data: {
          level: eventType.riskScore > 90 ? 'critical' : 'high',
          title: `Activité ${eventType.type} détectée`,
          description: `${message} depuis ${sourceIP}`,
          category: eventType.category,
          source: sourceIP,
          metadata: {
            riskScore: eventType.riskScore,
            eventType: eventType.type,
            automated: true
          }
        }
      });
    } catch (error) {
      // Gérer les erreurs P2021 (table non trouvée) gracieusement - mode silencieux en développement
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        if (process.env.NODE_ENV === 'development') {
          // Mode silencieux - ne pas logger
          return;
        }
      }
      // En production uniquement, logger l'erreur
      if (process.env.NODE_ENV === 'production') {
        logger.error('Erreur lors de la création de l\'alerte de sécurité:', error);
      }
    }
  }

  // Générer une alerte aléatoire
  async generateRandomAlert() {
    const alertTypes = [
      {
        level: 'medium',
        title: 'Configuration obsolète détectée',
        description: 'Certaines configurations de sécurité nécessitent une mise à jour',
        category: 'configuration'
      },
      {
        level: 'high',
        title: 'Activité inhabituelle détectée',
        description: 'Pattern d\'accès inhabituel sur l\'API',
        category: 'monitoring'
      },
      {
        level: 'low',
        title: 'Maintenance de sécurité planifiée',
        description: 'Mise à jour de sécurité programmée pour ce soir',
        category: 'maintenance'
      }
    ];

    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];

    await prisma.securityAlert.create({
      data: {
        level: alertType.level,
        title: alertType.title,
        description: alertType.description,
        category: alertType.category,
        source: 'security-monitor',
        metadata: {
          automated: true,
          priority: alertType.level
        }
      }
    });
  }

  // Générer des logs de sécurité réalistes
  async generateSecurityLogs() {
    const now = new Date();
    const logTypes = [
      { category: 'authentication', eventType: 'login_attempt', level: 'info' },
      { category: 'authentication', eventType: 'login_success', level: 'info' },
      { category: 'authentication', eventType: 'login_failure', level: 'warning' },
      { category: 'intrusion', eventType: 'suspicious_activity', level: 'warning' },
      { category: 'intrusion', eventType: 'sql_injection_attempt', level: 'error' },
      { category: 'ddos', eventType: 'high_traffic', level: 'warning' },
      { category: 'monitoring', eventType: 'system_check', level: 'info' }
    ];

    const ips = [
      '192.168.1.100', '10.0.0.50', '203.0.113.1', '198.51.100.1',
      '172.16.0.1', '192.168.100.1', '10.10.10.1', '203.0.113.195'
    ];

    const countries = ['FR', 'US', 'GB', 'DE', 'CA', 'AU', 'JP', 'CN'];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'curl/7.68.0',
      'python-requests/2.25.1'
    ];

    // Générer 50 logs réalistes sur les dernières 24 heures
    for (let i = 0; i < 50; i++) {
      const randomTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
      const ip = ips[Math.floor(Math.random() * ips.length)];
      const country = countries[Math.floor(Math.random() * countries.length)];
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      // Générer des messages réalistes selon le type
      let message = '';
      let riskScore = 10;

      switch (logType.eventType) {
        case 'login_attempt':
          message = 'Tentative de connexion utilisateur';
          riskScore = 15;
          break;
        case 'login_success':
          message = 'Connexion réussie';
          riskScore = 5;
          break;
        case 'login_failure':
          message = 'Échec d\'authentification';
          riskScore = 25;
          break;
        case 'suspicious_activity':
          message = 'Activité suspecte détectée';
          riskScore = 70;
          break;
        case 'sql_injection_attempt':
          message = 'Tentative d\'injection SQL détectée';
          riskScore = 85;
          break;
        case 'high_traffic':
          message = 'Trafic élevé détecté';
          riskScore = 60;
          break;
        case 'system_check':
          message = 'Vérification système automatique';
          riskScore = 5;
          break;
      }

      await prisma.securityLog.create({
        data: {
          timestamp: randomTime,
          level: logType.level,
          category: logType.category,
          eventType: logType.eventType,
          message,
          sourceIP: ip,
          country,
          userAgent,
          riskScore,
          isBlocked: riskScore > 80,
          metadata: {
            severity: riskScore > 80 ? 'high' : riskScore > 50 ? 'medium' : 'low',
            automated: true
          }
        }
      });
    }
  }

  // Générer des vulnérabilités réalistes
  async generateVulnerabilities() {
    const vulnerabilities = [
      {
        title: 'Configuration CORS trop permissive',
        description: 'L\'API Gateway accepte des origines trop larges, permettant des attaques CSRF potentielles',
        severity: 'high',
        cvssScore: 7.5,
        affectedComponent: 'api-gateway',
        status: 'in_progress',
        tags: ['cors', 'csrf', 'configuration'],
        remediation: 'Restreindre les origines autorisées dans la configuration CORS'
      },
      {
        title: 'Version obsolète de Express.js',
        description: 'Express.js version 4.18.2 présente des failles de sécurité connues (CVE-2023-12345)',
        severity: 'medium',
        cveId: 'CVE-2023-12345',
        cvssScore: 6.5,
        affectedComponent: 'express',
        status: 'open',
        tags: ['npm', 'express', 'dependencies'],
        remediation: 'Mettre à jour vers Express 4.19.0 ou supérieure'
      },
      {
        title: 'Headers de sécurité manquants',
        description: 'Certains headers de sécurité importants ne sont pas configurés (HSTS, CSP, X-Frame-Options)',
        severity: 'medium',
        cvssScore: 5.3,
        affectedComponent: 'web-server',
        status: 'resolved',
        tags: ['headers', 'security', 'web'],
        remediation: 'Configurer les headers de sécurité dans le serveur web'
      }
    ];

    for (const vuln of vulnerabilities) {
      await prisma.vulnerability.upsert({
        where: {
          title_affectedComponent: {
            title: vuln.title,
            affectedComponent: vuln.affectedComponent
          }
        },
        update: vuln,
        create: vuln
      });
    }
  }

  // Générer des tentatives d'intrusion réalistes
  async generateIntrusionAttempts() {
    const attackTypes = [
      'sql_injection',
      'xss_attempt',
      'path_traversal',
      'brute_force',
      'credential_stuffing'
    ];

    const ips = ['203.0.113.1', '198.51.100.1', '192.0.2.1', '203.0.113.195'];
    const endpoints = ['/api/v1/auth/login', '/api/v1/companies', '/api/v1/applications', '/api/v1/users'];

    for (let i = 0; i < 20; i++) {
      const randomTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      const ip = ips[Math.floor(Math.random() * ips.length)];
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

      let riskScore = 50;
      switch (attackType) {
        case 'sql_injection': riskScore = 85; break;
        case 'xss_attempt': riskScore = 75; break;
        case 'path_traversal': riskScore = 80; break;
        case 'brute_force': riskScore = 70; break;
        case 'credential_stuffing': riskScore = 65; break;
      }

      await prisma.intrusionAttempt.create({
        data: {
          timestamp: randomTime,
          sourceIP: ip,
          attackType,
          targetEndpoint: endpoint,
          method: 'POST',
          riskScore,
          isBlocked: riskScore > 70,
          blockReason: riskScore > 70 ? `${attackType} détecté` : null
        }
      });
    }
  }

  // Générer des attaques DDoS simulées
  async generateDDoSAttacks() {
    const attackTypes = ['volumetric', 'protocol', 'application'];
    const sourceIPs = [
      ['203.0.113.1', '203.0.113.2', '203.0.113.3'],
      ['198.51.100.1', '198.51.100.2'],
      ['192.0.2.1', '192.0.2.2', '192.0.2.3', '192.0.2.4']
    ];

    for (let i = 0; i < 5; i++) {
      const randomTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      const ips = sourceIPs[Math.floor(Math.random() * sourceIPs.length)];
      const duration = 60 + Math.floor(Math.random() * 300); // 1-6 minutes
      const requestsPerSecond = 100 + Math.floor(Math.random() * 900);

      await prisma.dDoSAttack.create({
        data: {
          timestamp: randomTime,
          sourceIPs: ips,
          countries: ['CN', 'RU', 'US'],
          attackType,
          targetEndpoint: '/api/v1/auth/login',
          duration,
          totalRequests: duration * requestsPerSecond,
          requestsPerSecond,
          isMitigated: Math.random() > 0.3
        }
      });
    }
  }
}

module.exports = new SecurityDataGenerator();
