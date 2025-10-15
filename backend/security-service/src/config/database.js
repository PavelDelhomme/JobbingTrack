const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function initializeDatabase() {
  try {
    // Test de connexion à la base de données
    await prisma.$connect();
    logger.info('Connexion à la base de données de sécurité établie');

    // Vérifier si les tables existent et les créer si nécessaire
    await prisma.$executeRaw`SELECT 1`;

    // Créer des données de développement si en mode développement
    if (process.env.NODE_ENV === 'development') {
      await seedDevelopmentData();
    }

  } catch (error) {
    logger.error('Erreur d\'initialisation de la base de données de sécurité:', error);
    throw error;
  }
}

async function seedDevelopmentData() {
  try {
    // Vérifier si des données existent déjà
    const existingLogs = await prisma.securityLog.count();

    if (existingLogs === 0) {
      logger.info('Création de données de développement pour la sécurité...');

      // Créer des logs de sécurité de test
      const securityLogs = [
        {
          level: 'warning',
          category: 'authentication',
          eventType: 'login_attempt',
          message: 'Tentative de connexion avec mot de passe incorrect',
          sourceIP: '192.168.1.100',
          userId: 'user_123',
          endpoint: '/api/v1/auth/login',
          method: 'POST',
          statusCode: 401,
          responseTime: 150,
          country: 'FR',
          city: 'Paris',
          riskScore: 25.0,
          isBlocked: false
        },
        {
          level: 'error',
          category: 'intrusion',
          eventType: 'suspicious_activity',
          message: 'Tentative d\'injection SQL détectée',
          sourceIP: '10.0.0.50',
          endpoint: '/api/v1/companies',
          method: 'GET',
          statusCode: 400,
          responseTime: 50,
          country: 'US',
          city: 'New York',
          riskScore: 85.0,
          isBlocked: true,
          blockReason: 'SQL injection attempt'
        },
        {
          level: 'critical',
          category: 'ddos',
          eventType: 'high_traffic',
          message: 'Trafic anormalement élevé détecté',
          sourceIP: '203.0.113.1',
          endpoint: '/api/v1/auth/login',
          method: 'POST',
          statusCode: 429,
          responseTime: 1000,
          country: 'CN',
          city: 'Beijing',
          riskScore: 95.0,
          isBlocked: true,
          blockReason: 'DDoS attack pattern'
        }
      ];

      for (const log of securityLogs) {
        await prisma.securityLog.create({ data: log });
      }

      // Créer des vulnérabilités de test
      const vulnerabilities = [
        {
          title: 'Dépréciation de dépendance obsolète',
          description: 'La dépendance lodash@4.17.4 présente des vulnérabilités de sécurité connues',
          severity: 'medium',
          cveId: 'CVE-2023-12345',
          cvssScore: 6.5,
          affectedComponent: 'lodash',
          status: 'open',
          tags: ['npm', 'dependencies', 'javascript'],
          remediation: 'Mettre à jour vers lodash@4.17.21 ou supérieure'
        },
        {
          title: 'Configuration CORS trop permissive',
          description: 'Le serveur API accepte des origines non autorisées',
          severity: 'high',
          cvssScore: 8.2,
          affectedComponent: 'api-gateway',
          status: 'in_progress',
          assignedTo: 'admin',
          tags: ['cors', 'security', 'configuration'],
          remediation: 'Restreindre les origines autorisées dans la configuration CORS'
        }
      ];

      for (const vuln of vulnerabilities) {
        await prisma.vulnerability.create({ data: vuln });
      }

      logger.info('Données de développement de sécurité créées avec succès');
    }
  } catch (error) {
    logger.error('Erreur lors de la création des données de développement de sécurité:', error);
  }
}

module.exports = {
  prisma,
  initializeDatabase
};
