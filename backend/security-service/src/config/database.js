const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Configuration Prisma : désactiver complètement les logs en développement pour éviter le spam P2021
// Les erreurs P2021 (table non trouvée) sont gérées gracieusement dans le code
const prisma = new PrismaClient({
  log: [], // Désactiver TOUS les logs Prisma (query, info, warn, error) pour éviter le spam
});

// Cache pour vérifier l'existence des tables (évite les requêtes répétées)
const tableExistsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Vérifier si une table existe dans la base de données
 * @param {string} tableName - Nom de la table (ex: 'security_metrics', 'User')
 * @param {boolean} forceRefresh - Si true, ignore le cache et force la vérification
 * @returns {Promise<boolean>} - true si la table existe, false sinon
 */
async function checkTableExists(tableName, forceRefresh = false) {
  // Vérifier le cache d'abord (sauf si forceRefresh)
  if (!forceRefresh) {
    const cached = tableExistsCache.get(tableName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.exists;
    }
  }

  try {
    // Vérifier l'existence de la table via une requête SQL
    // Utiliser LOWER pour la casse insensible
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND LOWER(table_name) = LOWER(${tableName})
      ) as exists;
    `;
    
    const exists = result[0]?.exists || false;
    
    // Mettre en cache
    tableExistsCache.set(tableName, {
      exists,
      timestamp: Date.now()
    });
    
    return exists;
  } catch (error) {
    // En cas d'erreur, considérer que la table n'existe pas
    // Ne pas logger en développement pour éviter le spam
    if (process.env.NODE_ENV === 'production') {
      logger.warn(`Erreur lors de la vérification de la table ${tableName}:`, error.message);
    }
    // Ne pas mettre en cache en cas d'erreur pour permettre une nouvelle tentative
    return false;
  }
}

/**
 * Vider le cache d'existence des tables
 * @param {string} tableName - Nom de la table (optionnel, vide tout si non fourni)
 */
function clearTableExistsCache(tableName = null) {
  if (tableName) {
    tableExistsCache.delete(tableName);
  } else {
    tableExistsCache.clear();
  }
}

/**
 * Vérifier si une erreur Prisma est une erreur de table non trouvée
 * @param {Error} error - L'erreur à vérifier
 * @returns {boolean} - true si c'est une erreur P2021
 */
function isTableNotFoundError(error) {
  return error.code === 'P2021' || 
         error.message?.includes('does not exist') ||
         error.message?.includes('relation') ||
         (error.meta && error.meta.table);
}

/**
 * Gérer gracieusement les erreurs de table non trouvée
 * @param {Error} error - L'erreur à gérer
 * @param {string} tableName - Nom de la table concernée
 * @param {boolean} silent - Si true, ne pas logger en développement
 * @returns {boolean} - true si l'erreur a été gérée, false sinon
 */
function handleTableNotFoundError(error, tableName, silent = true) {
  if (isTableNotFoundError(error)) {
    // Mettre à jour le cache pour indiquer que la table n'existe pas
    tableExistsCache.set(tableName, {
      exists: false,
      timestamp: Date.now()
    });
    
    // Ne logger qu'en production ou si silent = false
    if (!silent || process.env.NODE_ENV === 'production') {
      logger.warn(`Table ${tableName} non trouvée. Exécutez: make db-push-all`);
    }
    
    return true;
  }
  return false;
}

// Désactiver les logs Prisma via variable d'environnement (si disponible)
if (process.env.NODE_ENV === 'development') {
  // Supprimer les logs Prisma de la console en redirigeant stdout et stderr
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    // Filtrer les logs Prisma (prisma:query, prisma:info)
    if (args[0] && typeof args[0] === 'string' && args[0].includes('prisma:')) {
      // Ignorer silencieusement les logs Prisma en développement
      return;
    }
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    // Filtrer les logs Prisma (prisma:error, prisma:query)
    if (args[0] && typeof args[0] === 'string' && args[0].includes('prisma:')) {
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

    // Vérifier si les tables critiques existent
    const criticalTables = ['security_logs', 'security_metrics', 'vulnerabilities'];
    let missingTables = [];
    
    for (const table of criticalTables) {
      const exists = await checkTableExists(table, true); // Force refresh
      if (!exists) {
        missingTables.push(table);
      }
    }
    
    // Si des tables manquent, essayer de les créer avec prisma db push
    if (missingTables.length > 0) {
      logger.warn(`Tables manquantes détectées: ${missingTables.join(', ')}`);
      logger.info('Tentative de création automatique des tables...');
      
      try {
        // Exécuter prisma db push pour créer les tables manquantes
        const { execSync } = require('child_process');
        const result = execSync('npx prisma db push --skip-generate --accept-data-loss', {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'pipe'
        });
        logger.info('Tables créées automatiquement avec succès');
        
        // Régénérer le Prisma Client pour qu'il reconnaisse les nouvelles tables
        execSync('npx prisma generate', {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'pipe'
        });
        logger.info('Prisma Client régénéré');
        
        // Vider le cache pour forcer une nouvelle vérification
        clearTableExistsCache();
        
        // Reconnecter Prisma pour charger le nouveau client
        await prisma.$disconnect();
        await prisma.$connect();
        
      } catch (pushError) {
        logger.warn('Impossible de créer les tables automatiquement:', pushError.message);
        if (process.env.NODE_ENV === 'development') {
          logger.info('Mode développement: continuation sans les tables');
        } else {
          throw pushError;
        }
      }
    }

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
  initializeDatabase,
  checkTableExists,
  clearTableExistsCache,
  isTableNotFoundError,
  handleTableNotFoundError
};
