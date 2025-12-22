const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Fonction pour tester la connexion à PostgreSQL
async function testConnection(prisma, maxRetries = 30, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Tester la connexion avec une requête simple
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Connexion à PostgreSQL établie avec succès');
      return true;
    } catch (error) {
      const isConnectionError = 
        error.message?.includes('Can\'t reach database server') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('P1001') ||
        error.code === 'P1001' ||
        error.message?.includes('postgres:5432') ||
        error.message?.includes('terminating connection due to administrator command') ||
        error.code === 'E57P01' ||
        (error.cause && error.cause.code === 'E57P01');

      if (isConnectionError && attempt < maxRetries) {
        logger.warn(`⏳ Tentative ${attempt}/${maxRetries} - PostgreSQL n'est pas encore prêt, nouvelle tentative dans ${delay/1000}s...`);
        logger.warn(`   Erreur: ${error.message || error.code || 'Unknown error'}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt >= maxRetries) {
        logger.error(`❌ Impossible de se connecter à PostgreSQL après ${maxRetries} tentatives`);
        logger.error(`   Dernière erreur: ${error.message || error.code || 'Unknown error'}`);
        throw new Error(`Impossible de se connecter à PostgreSQL après ${maxRetries} tentatives: ${error.message}`);
      } else {
        // Erreur non liée à la connexion, relancer
        throw error;
      }
    }
  }
  return false;
}

// Créer le client Prisma avec gestion des reconnexions
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Fonction pour initialiser Prisma avec retry
async function initializePrisma() {
  try {
    logger.info('🔄 Initialisation de la connexion Prisma...');
    await testConnection(prisma, 30, 2000); // 30 tentatives, 2 secondes entre chaque
    logger.info('✅ Prisma initialisé avec succès');
    return prisma;
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de Prisma:', error);
    throw error;
  }
}

// Gestion de la déconnexion propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = {
  prisma,
  initializePrisma,
  testConnection
};

