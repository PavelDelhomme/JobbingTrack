require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const applicationRoutes = require('./routes/application.routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration des middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting spécifique à l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Plus restrictif pour l'auth
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
});
app.use('/api/v1/application', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'application-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/v1/application', applicationRoutes);

// Middlewares d'erreur
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`📋 Application Service démarré sur le port ${PORT}`);
  logger.info(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal reçu: fermeture du Application Service');
  server.close(() => {
    logger.info('Application Service fermé');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
