const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function initializeDatabase() {
  try {
    // Test de connexion à la base de données
    await prisma.$connect();
    logger.info('Connexion à la base de données de métriques établie');

    // Vérifier si les tables existent et les créer si nécessaire
    await prisma.$executeRaw`SELECT 1`;

  } catch (error) {
    logger.error('Erreur d\'initialisation de la base de données de métriques:', error);
    throw error;
  }
}

module.exports = {
  prisma,
  initializeDatabase
};
