const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

class SecurityDataGenerator {
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
