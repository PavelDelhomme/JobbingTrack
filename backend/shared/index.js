/**
 * @jobbingtrack/database
 * Client Prisma partagé pour tous les services JobbingTrack
 * 
 * Ce module exporte une instance singleton du client Prisma
 * qui se connecte à la base de données PostgreSQL unique.
 * 
 * Toutes les tables et relations sont définies dans prisma/schema.prisma
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Instance singleton du client Prisma
 * En développement, utilise une instance globale pour éviter trop de connexions
 * En production, crée une nouvelle instance
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal'
  });
} else {
  // En développement, utiliser une instance globale pour le hot-reload
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      errorFormat: 'pretty'
    });
  }
  prisma = global.prisma;
}

/**
 * Graceful shutdown - Fermer la connexion proprement
 */
const shutdown = async () => {
  await prisma.$disconnect();
  console.log('🔌 Prisma Client déconnecté');
};

// Écouter les signaux de fermeture
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('beforeExit', shutdown);

/**
 * Exports
 */
module.exports = {
  prisma,           // Instance singleton configurée
  PrismaClient,     // Classe pour créer de nouvelles instances si nécessaire
  shutdown          // Fonction de fermeture propre
};

/**
 * Export par défaut (ESM)
 */
module.exports.default = prisma;
