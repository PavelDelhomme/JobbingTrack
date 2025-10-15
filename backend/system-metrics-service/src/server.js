const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const metricsRoutes = require('./routes/metricsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { initializeDatabase } = require('./config/database');
const metricsScheduler = require('./services/metricsScheduler');

const app = express();
const PORT = process.env.PORT || 3018;

// Configuration de sécurité et middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes de santé
app.use('/health', healthRoutes);

// Routes API
app.use('/api/v1/metrics', metricsRoutes);

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  logger.info('Signal SIGTERM reçu, arrêt du planificateur...');
  metricsScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Signal SIGINT reçu, arrêt du planificateur...');
  metricsScheduler.stop();
  process.exit(0);
});

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    logger.info('Base de données de métriques initialisée avec succès');

    // Démarrer le planificateur de métriques
    metricsScheduler.start();
    logger.info('Planificateur de métriques démarré');

    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`📊 Service de métriques système démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur de métriques:', error);
    process.exit(1);
  }
}

// Démarrer le serveur si le fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;
