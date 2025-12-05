const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

// Configuration Prisma : désactiver les logs d'erreur en développement pour éviter le spam P2021
// Les erreurs P2021 (table non trouvée) sont gérées gracieusement dans le code
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? [] : ['error'], // Désactiver tous les logs en développement
});

async function initializeDatabase() {
  try {
    // Test de connexion à la base de données
    await prisma.$connect();
    logger.info('Connexion à la base de données établie');

    // Vérifier si les tables existent et les créer si nécessaire
    await prisma.$executeRaw`SELECT 1`;

    // Créer des données de test si en mode développement
    if (process.env.NODE_ENV === 'development') {
      await seedDevelopmentData();
    }

  } catch (error) {
    logger.error('Erreur d\'initialisation de la base de données:', error);
    throw error;
  }
}

async function seedDevelopmentData() {
  try {
    // Vérifier si des déploiements existent déjà (avec gestion d'erreur P2021)
    let existingDeployments = 0;
    try {
      existingDeployments = await prisma.deployment.count();
    } catch (error) {
      // Si la table n'existe pas (P2021), considérer qu'il n'y a pas de données
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        existingDeployments = 0;
      } else {
        throw error;
      }
    }

    if (existingDeployments === 0) {
      logger.info('Création de données de développement pour les déploiements...');

      // Créer quelques déploiements de test
      const deployments = [
        {
          version: '1.0.0',
          environment: 'production',
          status: 'success',
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // il y a 7 jours
          endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000), // 5 minutes plus tard
          duration: 300,
          commitHash: 'a1b2c3d4e5f6',
          branch: 'main',
          triggeredBy: 'system',
          buildTime: 120,
          testTime: 90,
          deployTime: 90,
          errorRate: 0.02,
          responseTime: 150.5
        },
        {
          version: '1.0.1',
          environment: 'staging',
          status: 'success',
          startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // il y a 3 jours
          endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000), // 4 minutes plus tard
          duration: 240,
          commitHash: 'f6e5d4c3b2a1',
          branch: 'develop',
          triggeredBy: 'developer-john',
          buildTime: 100,
          testTime: 80,
          deployTime: 60,
          errorRate: 0.01,
          responseTime: 145.2
        }
      ];

      for (const deployment of deployments) {
        try {
          await prisma.deployment.create({ data: deployment });
        } catch (error) {
          // Ignorer silencieusement si la table n'existe pas (P2021)
          if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            if (process.env.NODE_ENV === 'development') {
              // Mode silencieux - ne pas logger, juste continuer
              continue;
            }
          }
          throw error;
        }
      }

      logger.info('Données de développement créées avec succès');
    }
  } catch (error) {
    // Gérer les erreurs P2021 (table non trouvée) gracieusement en développement
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      if (process.env.NODE_ENV === 'development') {
        // Mode silencieux - ne pas logger, juste retourner
        return;
      }
    }
    // Ne logger que si ce n'est pas une erreur P2021 en développement
    if (process.env.NODE_ENV === 'production' || (error.code !== 'P2021' && !error.message?.includes('does not exist'))) {
      logger.error('Erreur lors de la création des données de développement:', error);
    }
  }
}

module.exports = {
  prisma,
  initializeDatabase
};
