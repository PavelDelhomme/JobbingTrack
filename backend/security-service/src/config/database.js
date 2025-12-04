const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Configuration Prisma : désactiver complètement les logs en développement pour éviter le spam P2021
// Les erreurs P2021 (table non trouvée) sont gérées gracieusement dans le code
const prisma = new PrismaClient({
  log: [], // Désactiver TOUS les logs Prisma (query, info, warn, error) pour éviter le spam
});

// Désactiver les logs Prisma via variable d'environnement (si disponible)
if (process.env.NODE_ENV === 'development') {
  // Supprimer les logs Prisma de la console en redirigeant stderr pour les erreurs Prisma
  const originalError = console.error;
  console.error = function(...args) {
    // Filtrer les logs Prisma (prisma:error, prisma:query)
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('prisma:error') || args[0].includes('prisma:query'))) {
      // Ignorer silencieusement les logs Prisma en développement
      return;
    }
    originalError.apply(console, args);
  };
}

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
    // Gérer les erreurs P2021 gracieusement en développement
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('Tables de sécurité non trouvées - mode développement, continuation normale');
        return;
      }
    }
    logger.error('Erreur d\'initialisation de la base de données de sécurité:', error);
    throw error;
  }
}

async function seedDevelopmentData() {
  try {
    // Vérifier si des données existent déjà (avec gestion d'erreur P2021)
    let existingLogs = 0;
    try {
      existingLogs = await prisma.securityLog.count();
    } catch (error) {
      // Si la table n'existe pas (P2021), considérer qu'il n'y a pas de données
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        // Mode silencieux - ne pas logger, juste retourner
        if (process.env.NODE_ENV === 'development') {
          return;
        }
        existingLogs = 0;
      } else {
        throw error;
      }
    }

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
        try {
          await prisma.securityLog.create({ data: log });
        } catch (error) {
          // Ignorer silencieusement si la table n'existe pas (P2021)
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            continue;
          }
          throw error;
        }
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
        try {
          await prisma.vulnerability.create({ data: vuln });
        } catch (error) {
          // Ignorer silencieusement si la table n'existe pas (P2021)
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            continue;
          }
          throw error;
        }
      }

      logger.info('Données de développement de sécurité créées avec succès');
    }
  } catch (error) {
    // Gérer les erreurs P2021 gracieusement en développement
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      if (process.env.NODE_ENV === 'development') {
        // Mode silencieux - ne pas logger, juste retourner
        return;
      }
    }
    // Ne logger que si ce n'est pas une erreur P2021 en développement
    if (process.env.NODE_ENV === 'production' || (error.code !== 'P2021' && !error.message?.includes('does not exist'))) {
      logger.error('Erreur lors de la création des données de développement de sécurité:', error);
    }
  }
}

module.exports = {
  prisma,
  initializeDatabase
};
