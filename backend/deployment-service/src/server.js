const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const deploymentRoutes = require('./routes/deploymentRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const rollbackRoutes = require('./routes/rollbackRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { initializeDatabase } = require('./config/database');
const deploymentScheduler = require('./services/deploymentScheduler');

const app = express();
const PORT = process.env.PORT || 3016;

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
app.use('/api/v1/deployments', deploymentRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/rollbacks', rollbackRoutes);

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

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Initialiser la base de données
    await initializeDatabase();
    logger.info('Base de données initialisée avec succès');

    // Démarrer le planificateur de déploiement
    deploymentScheduler.start();
    logger.info('Planificateur de déploiement démarré');

    // Démarrer le serveur
    app.listen(PORT, () => {
      logger.info(`🚀 Service de déploiement démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrer le serveur si le fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;
